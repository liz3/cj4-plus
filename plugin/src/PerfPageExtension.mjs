import {
  WT21FmcAvionicsPlugin,
  RouteMenuPage,
  StringInputFormat,
  SimpleStringFormat,
} from "@microsoft/msfs-wt21-fmc";
import msfsSdk, {
  AbstractFmcPageExtension,
  FlightPlanSegmentType,
  Subject,
} from "@microsoft/msfs-sdk";
import wt21Shared from "@microsoft/msfs-wt21-shared";

class PerfInitPageExtension extends AbstractFmcPageExtension {
  constructor(page) {
    super(page);
    this.simbriefId = Subject.create(GetStoredData("cj4_plus_simbrief_id"));
    this.fetchSimbrief = new msfsSdk.DisplayField(page, {
      formatter: new SimpleStringFormat("<LOAD UPLNK"),
      onSelected: async () => {
        return this.loadAndInsertPerf(page, this.simbriefId.get());
      },
    });
    page.bus
      .getSubscriber()
      .on("simbrief_id")
      .handle((v) => {
        this.simbriefId.set(v);
      });
  }
  async loadAndInsertPerf(page, id) {
    try {
      const response = await fetch(
        `https://www.simbrief.com/api/xml.fetcher.php?json=1&userid=${id}`,
      );
      const json = await response.json();
      const fms = page.fms;
      const { weights } = json;
      const pax = Number.parseInt(weights.pax_count_actual);
      const paxWeight = Number.parseFloat(weights.pax_weight);
      const unit = json.params.units;
      const simUnitVar = unit === "kgs" ? "kilograms" : "pounds";

      if (pax > 0) {
        //CAPT
        SimVar.SetSimVarValue(
          "PAYLOAD STATION WEIGHT:1",
          simUnitVar,
          paxWeight,
        );
      }
      if (pax > 1) {
        //FO
        SimVar.SetSimVarValue(
          "PAYLOAD STATION WEIGHT:2",
          simUnitVar,
          paxWeight,
        );
      }
      if (pax > 2) {
        //FRONT
        SimVar.SetSimVarValue(
          "PAYLOAD STATION WEIGHT:3",
          simUnitVar,
          paxWeight * (pax > 3 ? 2 : 1),
        );
      }
      if (pax > 4) {
        //MAIN
        SimVar.SetSimVarValue(
          "PAYLOAD STATION WEIGHT:4",
          simUnitVar,
          paxWeight * (pax - 4),
        );
      }

      const cargo = Number.parseInt(weights.cargo);
      SimVar.SetSimVarValue("PAYLOAD STATION WEIGHT:5", simUnitVar, cargo / 2);
      SimVar.SetSimVarValue("PAYLOAD STATION WEIGHT:6", simUnitVar, cargo / 1);

      const fuel = Number.parseInt(json.fuel.plan_ramp) / 2;
      const ratio = SimVar.GetSimVarValue("FUEL WEIGHT PER GALLON", simUnitVar);
      SimVar.SetSimVarValue(
        "FUEL TANK LEFT MAIN QUANTITY",
        "gallons",
        fuel / ratio,
      );
      SimVar.SetSimVarValue(
        "FUEL TANK RIGHT MAIN QUANTITY",
        "gallons",
        fuel / ratio,
      );

      fms.performancePlanProxy.cruiseAltitude.set(
        Number.parseInt(json.general.initial_altitude),
      );
      fms.performancePlanProxy.cargoWeight.set(unit === "kgs" ? cargo * 2.2 : cargo);
      fms.performancePlanProxy.paxNumber.set(pax);
      fms.performancePlanProxy.averagePassengerWeight.set(unit === "kgs" ? paxWeight * 2.2 : cargo);
      return "";
    } catch (err) {
      throw "UPKLNK LOAD FAILED";
    }
  }
  onPageRendered(renderedTemplates) {
    const elem = this.simbriefId.get();
    if (elem) renderedTemplates[0][12][0] = this.fetchSimbrief;
  }
}
export default PerfInitPageExtension;

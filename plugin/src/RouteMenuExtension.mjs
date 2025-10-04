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

class RouteMenuExtension extends AbstractFmcPageExtension {
  constructor(page) {
    super(page);
    this.simbriefId = Subject.create(GetStoredData("cj4_plus_simbrief_id"));
    this.fetchSimbrief = new msfsSdk.DisplayField(page, {
      formatter: new SimpleStringFormat("<FPLN RECALL"),
      onSelected: async () => {
        return this.loadAndInsertFpln(page, this.simbriefId.get());
      },
    });
    page.bus
      .getSubscriber()
      .on("simbrief_id")
      .handle((v) => {
        this.simbriefId.set(v);
      });
  }
  async loadAndInsertFpln(page, id) {
    try {
      const response = await fetch(
        `https://www.simbrief.com/api/xml.fetcher.php?json=1&userid=${id}`,
      );
      const json = await response.json();
      const fms = page.fms;

      const actions = [];
      actions.push(() => fms.emptyModFlightPlan(true));
      wt21Shared.FmcUserSettings.getManager(this.bus)
        .getSetting("flightNumber")
        .set(json.general.flight_number);
      // origin
      let results = await fms.facLoader.searchByIdent(
        msfsSdk.FacilitySearchType.Airport,
        json.origin.icao_code,
        1,
      );
      if (results && results.length === 1) {
        const facility = await fms.facLoader.getFacility(
          msfsSdk.FacilityType.Airport,
          results[0],
        );

        if (facility) {
          actions.push(() => fms.setOrigin(facility));
        }
      }
      // destination
      results = await fms.facLoader.searchByIdent(
        msfsSdk.FacilitySearchType.Airport,
        json.destination.icao_code,
        1,
      );
      if (results && results.length === 1) {
        const facility = await fms.facLoader.getFacility(
          msfsSdk.FacilityType.Airport,
          results[0],
        );
        if (facility) {
          actions.push(() => fms.setDestination(facility));
        }
      }
      let alternate = json.alternate;
      if(Array.isArray(alternate))
        alternate = alternate[0];
      if(alternate && alternate.icao_code){
          results = await fms.facLoader.searchByIdent(
        msfsSdk.FacilitySearchType.Airport,
        alternate.icao_code,
        1,
      );
      if (results && results.length === 1) {
        const facility = await fms.facLoader.getFacility(
          msfsSdk.FacilityType.Airport,
          results[0],
        );
        if (facility) {
          actions.push(() => fms.setFlightPlanAlternate(facility));
        }
      }
      }
      const idx = fms.ensureOnlyOneSegmentOfType(
        0,
        FlightPlanSegmentType.Enroute,
        true,
      );
      for (const entry of json.navlog.fix) {
        if (entry.is_sid_star === "1" || entry.type === "ltlg") continue;
        const results = await fms.facLoader.searchByIdent(
          msfsSdk.FacilitySearchType.All,
          entry.ident,
        );
        let found = null;
        const lat = Number.parseFloat(entry.pos_lat);
        const lon = Number.parseFloat(entry.pos_long);
        for (const icao of results) {
          const fac = await fms.facLoader.getFacility(
            msfsSdk.ICAO.getFacilityType(icao),
            icao,
          );
          if(entry.type === "vor" && fac.name === entry.name) {
            found = fac;
            break;
          }
          if (
            lon.toFixed(4) === fac.lon.toFixed(4) &&
            lat.toFixed(4) === fac.lat.toFixed(4)
          ) {
            found = fac;
            break;
          }
        }
      // actions.push(() => fms.activePerformancePlan.cruiseAltitude.set(Number.parseInt(json.general.initial_altitude)))

        if (!found) throw `Couldnt find ${entry.ident}`;
        actions.push(() =>fms.insertWaypoint(found, idx));
      }
      for (const a of actions) a();
      page.bus
        .getPublisher()
        .pub(
          "fmc_new_message",
          new wt21Shared.Message(
            "FPLN UPLNK INSERTED",
            wt21Shared.MESSAGE_LEVEL.White,
            999,
            wt21Shared.MESSAGE_TARGET.FMC,
            wt21Shared.FMS_MESSAGE_ID.DLFPLNLOADED,
          ),
          false,
          false,
        );

      return "";
    } catch (err) {
      throw "UPKLNK LOAD FAILED";
    }
  }
  onPageRendered(renderedTemplates) {
    const elem = this.simbriefId.get();
    renderedTemplates[0][6] = [
      elem && elem.length ? this.fetchSimbrief : "<FPLN RECALL[disabled]",
    ];
  }
}
export default RouteMenuExtension;

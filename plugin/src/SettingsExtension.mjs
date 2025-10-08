import {
  WT21FmcAvionicsPlugin,
  UserSettingsPage,
  RouteMenuPage,
  StringInputFormat,
} from "@microsoft/msfs-wt21-fmc";
import msfsSdk, {
  AbstractFmcPageExtension,
  Subject,
} from "@microsoft/msfs-sdk";

class PlusSettingsExtension extends AbstractFmcPageExtension {
  constructor(page) {
    super(page);
    this.simbriefId = Subject.create(GetStoredData("cj4_plus_simbrief_id"));
    this.hoppieId = Subject.create(GetStoredData("cj4_plus_hoppie_code"));
    this.cduSetting = Subject.create(
      GetStoredData("cj4_plus_winwing_setting") === "true" ? 1 : 0,
    );
    this.networkOptions = ["HOPPIE", "SAYINTENTIONS"];
    this.networkOption = Subject.create(
      GetStoredData("cj4_plus_network_setting")
        ? this.networkOptions.indexOf(
            GetStoredData("cj4_plus_network_setting").toUpperCase(),
          )
        : 0,
    );
    this.cduSwitch = new msfsSdk.SwitchLabel(page, {
      optionStrings: ["OFF", "ON"],
      activeStyle: "green",
    }).bind(this.cduSetting);
    this.networkSwitch = new msfsSdk.SwitchLabel(page, {
      optionStrings: this.networkOptions,
      activeStyle: "green",
    }).bind(this.networkOption);
   this.networkOption.sub((v) => {
      SetStoredData("cj4_plus_network_setting", this.networkOptions[v]);
      page.bus.getPublisher().pub("cj4_plus_network_setting", this.networkOptions[v], true, false);
    });
    this.cduSetting.sub((v) => {
      SetStoredData("cj4_plus_winwing_setting", v === 1 ? "true" : "false");
      page.bus.getPublisher().pub("cj4_plus_winwing_setting", v === 1, true, false);
    });
    this.simbriefField = new msfsSdk.TextInputField(page, {
      formatter: new StringInputFormat({ nullValueString: "-----" }),
      onSelected: async (scratchpadContents) => {
        if (scratchpadContents.length) {
          SetStoredData("cj4_plus_simbrief_id", scratchpadContents.toString());
          this.simbriefId.set(scratchpadContents);
          page.bus.getPublisher().pub("simbrief_id", scratchpadContents, true, false);
        }
        return Promise.resolve(null);
      },
      onDelete: async () => {
        SetStoredData("cj4_plus_simbrief_id", null);
        page.bus.getPublisher().pub("simbrief_id", "");
        this.simbriefId.set("");
        return true;
      },
      prefix: "",
    }).bind(this.simbriefId);
    this.hoppieField = new msfsSdk.TextInputField(page, {
      formatter: new StringInputFormat({
        nullValueString: "-----",
        maxLength: 20,
      }),
      onSelected: (scratchpadContents) => {
        return new Promise((resolve) => {
          const id = `${Date.now()}--hoppie-input`;
          const input = document.createElement("input");
          input.style.display = "absolute";
          let s = false;
          input.addEventListener("input", (event) => {
            const v = event.target.value;
            SetStoredData("cj4_plus_hoppie_code", v);
            this.hoppieId.set(v);
            page.bus.getPublisher().pub("hoppie_code", v);
            s = true;
            event.target.blur();
            event.target.remove();
            Coherent.trigger("UNFOCUS_INPUT_FIELD", id);
            resolve("");
          });
          input.addEventListener("blur", (event) => {
            if (s) return;
            this.hoppieId.set("");
            event.target.blur();
            event.target.remove();
            Coherent.trigger("UNFOCUS_INPUT_FIELD", id);
            resolve("");
          });
          document.body.appendChild(input);
          input.focus();
          Coherent.trigger("FOCUS_INPUT_FIELD", id, "", "", "", false);
          this.hoppieId.set("PASTE NOW");
        });
      },
      onDelete: async () => {
        SetStoredData("cj4_plus_hoppie_code", null);
        page.bus.getPublisher().pub("hoppie_code", "");
        this.hoppieId.set("");
        return true;
      },
      prefix: "",
    }).bind(this.hoppieId);
  }

  onPageRendered(renderedTemplates) {
    renderedTemplates[0][7] = [" NETWORK[blue]"];
    renderedTemplates[0][8] = [this.networkSwitch];
    renderedTemplates[0][9] = [" SIMBRIEF ID[blue]", "WINWING CDU[blue]"];
    renderedTemplates[0][10] = [this.simbriefField, this.cduSwitch];

    renderedTemplates[0][11] = [" HOPPIE CODE[blue]"];
    renderedTemplates[0][12] = [this.hoppieField];
  }
}
export default PlusSettingsExtension;

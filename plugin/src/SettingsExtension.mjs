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
    this.simbriefField = new msfsSdk.TextInputField(page, {
      formatter: new StringInputFormat({ nullValueString: "-----" }),
      onSelected: async (scratchpadContents) => {
        if (scratchpadContents.length) {
          SetStoredData("cj4_plus_simbrief_id", scratchpadContents.toString());
          this.simbriefId.set(scratchpadContents);
          page.bus.getPublisher().pub("simbrief_id", scratchpadContents);
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
      formatter: new StringInputFormat({ nullValueString: "-----", maxLength: 20 }),
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
            if(s)
              return;
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
    renderedTemplates[0][9] = [" Simbrief ID[blue]"];
    renderedTemplates[0][10] = [this.simbriefField];

    renderedTemplates[0][11] = [" Hoppie code[blue]"];
    renderedTemplates[0][12] = [this.hoppieField];
  }
}
export default PlusSettingsExtension;

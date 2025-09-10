import {
  WT21FmcAvionicsPlugin,
  UserSettingsPage,
  RouteMenuPage,
  StringInputFormat,
} from "@microsoft/msfs-wt21-fmc";
import msfsSdk, {
  AbstractFmcPageExtension,
  PageLinkField,
  Subject,
} from "@microsoft/msfs-sdk";

class DatalinkPageExtension extends AbstractFmcPageExtension {
  constructor(page) {
    super(page);
  }

  onPageRendered(renderedTemplates) {
    renderedTemplates[0][4][1] = PageLinkField.createLink(
      this.page,
      "DEPART CLX>",
      "/datalink-extra/predep",
    );
        renderedTemplates[0][6][1] = PageLinkField.createLink(
      this.page,
      "OCEANIC CLX>",
      "/datalink-extra/oceanic",
    );
   renderedTemplates[0][8][1] = PageLinkField.createLink(
      this.page,
      "AIR TO AIR MSG>",
      "/datalink-extra/telex",
    );
     renderedTemplates[0][2][0] = PageLinkField.createLink(
      this.page,
      "<RCVD MSGS",
      "/datalink-extra/recv-msgs",
    );
    renderedTemplates[0][4][0] = PageLinkField.createLink(
      this.page,
      "<SEND MSGS",
      "/datalink-extra/send-msgs",
    );
        renderedTemplates[0][10][0] = PageLinkField.createLink(
      this.page,
      "<ATIS",
      "/datalink-extra/atis",
    );
  }
}
export default DatalinkPageExtension;

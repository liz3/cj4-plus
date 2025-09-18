import {
  WT21FmcAvionicsPlugin,
  UserSettingsPage,
  RouteMenuPage,
  DataLinkMenuPage,
  PerfInitPage,
} from "@microsoft/msfs-wt21-fmc";
import msfsSdk, {
  AbstractFmcPageExtension,
  AnnunciationType,
  CasRegistrationManager,
  Subject,
} from "@microsoft/msfs-sdk";
import wt21Shared from "@microsoft/msfs-wt21-shared";
import CdiRenderer from "./CduRenderer.mjs";
import PlusSettingsExtension from "./SettingsExtension.mjs";
import RouteMenuExtension from "./RouteMenuExtension.mjs";
import DatalinkPageExtension from "./DatalinkPageExtension.mjs";
import {
  DatalinkAtisPage,
  DatalinkDirectToPage,
  DatalinkLevelPage,
  DatalinkMessagePage,
  DatalinkOceanicRequestPage,
  DatalinkPreDepartureRequestPage,
  DatalinkReceivedMessagesPage,
  DatalinkSendMessagesPage,
  DatalinkSpeedPage,
  DatalinkStatusPage,
  DatalinkTelexPage,
} from "./DatalinkPages.mjs";
import { createClient } from "./Hoppie.mjs";
import PerfInitPageExtension from "./PerfPageExtension.mjs";
import acarsService from "./AcarsService.mjs";

class Plugin extends WT21FmcAvionicsPlugin {
  constructor(binder) {
    super(binder);
    this.binder = binder;
    this.acarsClient = Subject.create(null);
  }
  onInit() {}
  onInstalled() {}
  registerFmcExtensions(context) {
    const name = SimVar.GetSimVarValue("TITLE", "string");
    if (name !== "Cessna Citation CJ4" && name !== "Cessna CJ4 Citation Asobo") return;
    SimVar.SetSimVarValue("L:CJ4_PLUS_ACTIVE", "number", 1);
    this.renderer = context.renderer;
    this.cduRenderer = new CdiRenderer(this.renderer, this.binder);

    context.addPluginPageRoute(
      "/datalink-extra/predep",
      DatalinkPreDepartureRequestPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/oceanic",
      DatalinkOceanicRequestPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/send-msgs",
      DatalinkSendMessagesPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/recv-msgs",
      DatalinkReceivedMessagesPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/telex",
      DatalinkTelexPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/atis",
      DatalinkAtisPage,
      undefined,
      {},
    );

    context.addPluginPageRoute(
      "/datalink-extra/message",
      DatalinkMessagePage,
      undefined,
      {},
    );
    context.addPluginPageRoute(
      "/datalink-extra/cpdlc/status",
      DatalinkStatusPage,
      undefined,
      {},
    );
    context.addPluginPageRoute(
      "/datalink-extra/cpdlc/direct",
      DatalinkDirectToPage,
      undefined,
      {},
    );
    context.addPluginPageRoute(
      "/datalink-extra/cpdlc/speed",
      DatalinkSpeedPage,
      undefined,
      {},
    );
    context.addPluginPageRoute(
      "/datalink-extra/cpdlc/level",
      DatalinkLevelPage,
      undefined,
      {},
    );
    context.attachPageExtension(UserSettingsPage, PlusSettingsExtension);
    context.attachPageExtension(RouteMenuPage, RouteMenuExtension);
    context.attachPageExtension(DataLinkMenuPage, DatalinkPageExtension);
    context.attachPageExtension(PerfInitPage, PerfInitPageExtension);

    if (this.binder.isPrimaryInstrument) {
      this.client = acarsService(this.binder.bus);
    }
  }
}
msfsSdk.registerPlugin(Plugin);

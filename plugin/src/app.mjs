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
  DatalinkMessagePage,
  DatalinkOceanicRequestPage,
  DatalinkPreDepartureRequestPage,
  DatalinkReceivedMessagesPage,
  DatalinkSendMessagesPage,
  DatalinkTelexPage,
} from "./DatalinkPages.mjs";
import { createClient } from "./Hoppie.mjs";
import PerfInitPageExtension from "./PerfPageExtension.mjs";

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
    if(name !== "Cessna Citation CJ4")
      return;
    SimVar.SetSimVarValue("L:CJ4_PLUS_ACTIVE", "number", 1);
    this.renderer = context.renderer;
    this.cduRenderer = new CdiRenderer(this.renderer, this.binder);

    context.addPluginPageRoute(
      "/datalink-extra/predep",
      DatalinkPreDepartureRequestPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/oceanic",
      DatalinkOceanicRequestPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/send-msgs",
      DatalinkSendMessagesPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/recv-msgs",
      DatalinkReceivedMessagesPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/telex",
      DatalinkTelexPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/atis",
      DatalinkAtisPage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.addPluginPageRoute(
      "/datalink-extra/message",
      DatalinkMessagePage,
      undefined,
      {
        acarsClient: this.acarsClient,
      },
    );

    context.attachPageExtension(UserSettingsPage, PlusSettingsExtension);
    context.attachPageExtension(RouteMenuPage, RouteMenuExtension);
    context.attachPageExtension(DataLinkMenuPage, DatalinkPageExtension);
    context.attachPageExtension(PerfInitPage, PerfInitPageExtension);


    wt21Shared.FmcUserSettings.getManager(this.binder.bus)
      .getSetting("flightNumber")
      .sub((value) => {
        if (!value || !value.length) {
          const current = this.acarsClient.get();
          if (current) {
            current.dispose();
          }
          this.acarsClient.set(null);
          return;
        }
        this.acarsClient.set(
          createClient(
            GetStoredData("cj4_plus_hoppie_code"),
            value,
            "C25C",
            (message) => {
              if (message.type === "send") {
                this.binder.bus
                  .getPublisher()
                  .pub("acars_outgoing_message", message);
              } else {
                this.binder.bus
                  .getPublisher()
                  .pub("acars_incoming_message", message);
                  SimVar.SetSimVarValue("L:WT_CMU_DATALINK_RCVD", "number", 1);
              }
            },
          ),
        );
      });
  }
}
msfsSdk.registerPlugin(Plugin);

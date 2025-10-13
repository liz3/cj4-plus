import {
  WT21FmcAvionicsPlugin,
  UserSettingsPage,
  RouteMenuPage,
  StringInputFormat,
  WT21FmcPage,
  FmcCmuCommons,
} from "@microsoft/msfs-wt21-fmc";
import wt21Shared from "@microsoft/msfs-wt21-shared";

import msfsSdk, {
  AbstractFmcPageExtension,
  AnnunciationType,
  DisplayField,
  PageLinkField,
  Subject,
} from "@microsoft/msfs-sdk";
import { convertUnixToHHMM } from "./Hoppie.mjs";
import {
  fetchAcarsMessages,
  fetchAcarsStatus,
  deleteMessage,
} from "./AcarsService.mjs";

export class DatalinkSendMessagesPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.messages = Subject.create([[]]);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.bus
      .getSubscriber()
      .on("acars_message_removal")
      .handle((idv) => {
        const current = this.messages.get();
        for (let i = 0; i < current.length; i += 1) {
          current[i] = current[i].filter((e) => e.message._id !== idv);
        }
        this.messages.set(current);
        this.invalidate();
      });
    this.bus
      .getSubscriber()
      .on("acars_outgoing_message")
      .handle((message) => {
        const current = this.messages.get();
        const entry = {
          message,
          link: PageLinkField.createLink(
            this,
            `<${message.content.substr(0, 23)}`,
            "/datalink-extra/message",
            false,
            {
              message,
            },
          ),
        };
        if (current[0].length < 5) {
          current[0].unshift(entry);
        } else {
          current.unshift([entry]);
        }
        this.messages.set(current);
        this.invalidate();
      });

    fetchAcarsMessages(this.bus, "send").then((messages) => {
      for (const message of messages) {
        const current = this.messages.get();
        const entry = {
          message,
          link: PageLinkField.createLink(
            this,
            `<${message.content.substr(0, 23)}`,
            "/datalink-extra/message",
            false,
            {
              message,
            },
          ),
        };
        if (current[0].length < 5) {
          current[0].unshift(entry);
        } else {
          current.unshift([entry]);
        }
        this.messages.set(current);
      }
      this.invalidate();
    });
  }

  render() {
    return this.messages.get().map((page) => {
      const array = Array(10)
        .fill()
        .map((e) => []);
      page.forEach((val, index) => {
        const nn = index * 2;
        array[nn] = [`${convertUnixToHHMM(val.message.ts)}[blue]`];
        array[nn + 1] = [val.link];
      });

      return [
        ["DL[blue]", this.PagingIndicator, "SEND MSGS[blue]"],
        ...array,
        [],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ];
    });
  }
}

export class DatalinkReceivedMessagesPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.messages = Subject.create([[]]);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.bus
      .getSubscriber()
      .on("acars_message_removal")
      .handle((idv) => {
        const current = this.messages.get();
        for (let i = 0; i < current.length; i += 1) {
          current[i] = current[i].filter((e) => e.message._id !== idv);
        }
        this.messages.set(current);
        this.invalidate();
      });
    this.bus
      .getSubscriber()
      .on("acars_incoming_message")
      .handle((message) => {
        const current = this.messages.get();
        const entry = {
          message,
          link: PageLinkField.createLink(
            this,
            `<${message.from} ${message.content.substr(0, 22 - message.from.length)}`,
            "/datalink-extra/message",
            false,
            {
              message,
            },
          ),
        };
        if (current[0].length < 5) {
          current[0].unshift(entry);
        } else {
          current.unshift([entry]);
        }
        this.messages.set(current);
        this.invalidate();
      });
    this.bus
      .getSubscriber()
      .on("acars_message_state_update")
      .handle((e) => {
        const current = this.messages.get();

        for (const row of current) {
          const msg = row.find((t) => t.message._id === e.id);
          if (msg) {
            msg.respondSend = e.option;
            break;
          }
        }
        this.messages.set(current);
      });
    fetchAcarsMessages(this.bus, "recv").then((messages) => {
      for (const message of messages) {
        const current = this.messages.get();
        const entry = {
          message,
          link: PageLinkField.createLink(
            this,
            `<${message.content.substr(0, 23)}`,
            "/datalink-extra/message",
            false,
            {
              message,
            },
          ),
        };
        if (current[0].length < 5) {
          current[0].unshift(entry);
        } else {
          current.unshift([entry]);
        }
        this.messages.set(current);
      }
      this.invalidate();
    });
  }

  render() {
    SimVar.SetSimVarValue("L:WT_CMU_DATALINK_RCVD", "number", 0);
    return this.messages.get().map((page) => {
      const array = Array(10)
        .fill()
        .map((e) => []);
      page.forEach((val, index) => {
        const nn = index * 2;
        array[nn] = [`${convertUnixToHHMM(val.message.ts)}[blue]`];
        array[nn + 1] = [val.link];
      });

      return [
        ["DL[blue]", this.PagingIndicator, "RCVD MSGS[blue]"],
        ...array,
        [],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ];
    });
  }
}

export class DatalinkMessagePage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.options = [];
    this.deleteField = new DisplayField(this, {
      formatter: {
        nullValueString: "DEL>[blue]",
        format: (value) => {
          return "DEL>[blue]";
        },
      },
      onSelected: async () => {
        const message = this.params.get("message");
        if (message) {
          this.screen.navigateTo(
            `/datalink-extra/${message.type === "send" ? "send-msgs" : "recv-msgs"}`,
          );
          deleteMessage(this.bus, message._id);
        }
        return true;
      },
    });
    this.updateHandler = bus
      .getSubscriber()
      .on("acars_message_state_update")
      .handle((e) => {
        const message = this.params.get("message");
        if (message && e.id === message._id) {
          message.respondSend = e.option;
          this.options = [
            ...message.options.map((e) => (message.respondSend === e ? e : "")),
          ];
          this.invalidate();
        }
      });
  }

  onDestroy() {
    this.updateHandler.destroy();
  }
  onPause() {
    this.updateHandler.pause();
  }
  onResume() {
    this.updateHandler.resume();
  }
  render() {
    const message = this.params.get("message");
    let messageLines = 9;
    if (message.options) {
      messageLines = 8;
      if (this.msg !== message) {
        this.options = [];
        this.msg = message;
        if (!message.respondSend) {
          for (let i = 0; i < message.options.length; i++) {
            const opt = message.options[i];
            this.options.push(
              new DisplayField(this, {
                formatter: {
                  format(value) {
                    return i === 0
                      ? `<${opt}[blue s-text]`
                      : `${opt}>[blue s-text]`;
                  },
                },
                onSelected: async () => {
                  if (message.respondSend) return true;
                  this.bus.getPublisher().pub(
                    "acars_message_ack",
                    {
                      option: opt,
                      id: message._id,
                    },
                    true,
                    false,
                  );
                  return true;
                },
              }).bind(Subject.create(opt)),
            );
          }
        } else {
          this.options = [
            ...message.options.map((e) => (message.respondSend === e ? e : "")),
          ];
        }
      }
    }
    const pages = message.content
      .replace(/\n/g, " ")
      .split(" ")
      .map((e) => `${e} `)
      .reduce(
        (acc, val) => {
          const wordParts = [];
          while (val.length > 24) {
            wordParts.push(val.substr(0, 24));
            val = val.substr(24);
          }
          wordParts.push(val);
          for (const part of wordParts) {
            const last = acc[acc.length - 1];
            if (last.length) {
              const lastLine = last[last.length - 1][0];
              const remaining = 24 - lastLine.length;
              if (remaining >= part.length) {
                last[last.length - 1][0] = lastLine + part;
              } else {
                last[last.length - 1][0] = lastLine.trim();
                if (
                  last.length <
                  (acc.length === 1 ? messageLines - 1 : messageLines)
                ) {
                  last.push([part]);
                } else {
                  acc.push([[part]]);
                }
              }
            } else {
              last.push([part]);
            }
          }
          return acc;
        },
        [[]],
      )
      .map((page, i) => {
        if (i === 0) page.unshift([message.from]);
        while (page.length < messageLines) page.push([]);
        if (message.options) {
          page.push([this.options[0], this.options[1]]);
        }
        return [
          [
            "DL[blue]",
            this.PagingIndicator,
            `${message.type === "send" ? "SEND" : "RECV"} MSG[blue]`,
          ],
          [`${convertUnixToHHMM(message.ts)}[blue]`],
          ...page,
          [],
          [
            PageLinkField.createLink(
              this,
              "<RETURN",
              `/datalink-extra/${message.type === "send" ? "send-msgs" : "recv-msgs"}`,
            ),
            message.options ? this.options[2] : this.deleteField,
            this.clockField,
          ],
        ];
      });

    return pages;
  }
}

export class DatalinkAtisPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.send = Subject.create(false);
    this.reqType = Subject.create(0);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.facility = Subject.create("");
    this.opts = ["ATIS", "METAR", "TAF"];
    this.typeSwitch = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.opts,
      activeStyle: "green",
    }).bind(this.reqType);

    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "atisRequest",
              arguments: [this.facility.get(), this.opts[this.reqType.get()]],
            },
            true,
            false,
          );

          [this.facility].forEach((e) => e.set(""));
          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);

    this.facilityField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□",
        maxLength: 4,
      }),
      onSelected: async (scratchpadContents) => {
        this.facility.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.facility);
  }
  checkReady() {
    this.send.set(this.facility.get());
  }
  render() {
    return [
      [
        ["DL[blue]", "", "ATIS REQ[blue]"],
        ["FACILITY[blue]"],
        [this.facilityField],
        ["TYPE[blue]", ""],
        [this.typeSwitch],
        [],
        [],
        [],
        [],
        [""],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkPreDepartureRequestPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.flightId = Subject.create("");
    this.facility = Subject.create("");
    this.acType = Subject.create("C25C");
    this.atis = Subject.create("");
    this.dep = Subject.create("");
    this.arr = Subject.create("");
    this.gate = Subject.create("");
    this.send = Subject.create(false);

    for (let i = 0; i < 4; i++) {
      this[`freeText${i}`] = Subject.create("");
      this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "(----------------------)[blue]",
          maxLength: 24,
        }),
        onSelected: async (scratchpadContents) => {
          this[`freeText${i}`].set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this[`freeText${i}`]);
    }

    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          const freeText = Array(4)
            .fill()
            .map((_, i) => this[`freeText${i}`].get())
            .filter((e) => e && e.length)
            .join(" ");
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendPdc",
              arguments: [
                this.facility.get(),
                this.dep.get(),
                this.arr.get(),
                this.gate.get(),
                this.atis.get(),
                convertUnixToHHMM(Date.now()),
                freeText,
              ],
            },
            true,
            false,
          );

          [this.atis, this.facility, this.gate].forEach((e) => e.set(""));
          Array(4)
            .fill()
            .forEach((_, i) => this[`freeText${i}`].set(""));
          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);

    this.flightIdField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□",
        maxLength: 7,
      }),
      onSelected: async (scratchpadContents) => {
        this.flightId.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.flightId);
    this.facilityField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□",
        maxLength: 7,
      }),
      onSelected: async (scratchpadContents) => {
        this.facility.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.facility);

    this.acTypeField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□",
        maxLength: 4,
      }),
      onSelected: async (scratchpadContents) => {
        this.acType.set(scratchpadContents);
        return true;
      },
    }).bind(this.acType);

    this.atisField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({ nullValueString: "□", maxLength: 1 }),
      onSelected: async (scratchpadContents) => {
        this.atis.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.atis);

    this.depField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□",
        maxLength: 4,
      }),
      onSelected: async (scratchpadContents) => {
        this.dep.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.dep);

    this.arrField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□",
        maxLength: 4,
      }),
      onSelected: async (scratchpadContents) => {
        this.arr.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.arr);

    this.gateField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□",
        maxLength: 7,
      }),
      onSelected: async (scratchpadContents) => {
        this.gate.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.gate);
    this.bus
      .getSubscriber()
      .on("fplOriginDestChanged")
      .handle((evt) => {
        switch (evt.type) {
          case msfsSdk.OriginDestChangeType.OriginAdded: {
            if (evt.airport) {
              this.fms.facLoader
                .getFacility(
                  msfsSdk.ICAO.getFacilityType(evt.airport),
                  evt.airport,
                )
                .then((airport) => {
                  this.dep.set(airport.icaoStruct.ident);
                });
            }

            break;
          }
          case msfsSdk.OriginDestChangeType.DestinationAdded: {
            if (evt.airport) {
              this.fms.facLoader
                .getFacility(
                  msfsSdk.ICAO.getFacilityType(evt.airport),
                  evt.airport,
                )
                .then((airport) => {
                  this.arr.set(airport.icaoStruct.ident);
                  this.flightId.set(
                    wt21Shared.FmcUserSettings.getManager(this.bus)
                      .getSetting("flightNumber")
                      .get(),
                  );
                });
            }

            break;
          }
        }
      });
    this.flightId.set(
      wt21Shared.FmcUserSettings.getManager(this.bus)
        .getSetting("flightNumber")
        .get(),
    );
    if (this.fms.getPlanForFmcRender().destinationAirportIcao)
      this.arr.set(this.fms.getPlanForFmcRender().destinationAirportIcao.ident);
    if (this.fms.getPlanForFmcRender().originAirportIcao)
      this.dep.set(this.fms.getPlanForFmcRender().originAirportIcao.ident);
  }
  checkReady() {
    const array = [this.dep, this.arr, this.flightId, this.atis, this.facility];
    this.send.set(
      !array.find((e) => {
        const v = e.get();
        return !v || !v.length;
      }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "DEPART CLX REQ[blue]"],
        ["ATS FLT ID[blue]", "FACILITY[blue]"],
        [this.flightIdField, this.facilityField],
        ["A/C TYPE[blue]", "ATIS[blue]"],
        [this.acTypeField, this.atisField],
        ["ORIG STA[blue]", "DEST STA[blue]"],
        [this.depField, this.arrField],
        ["GATE[blue]"],
        [this.gateField],
        [""],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "DEPART CLX REQ[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        [this.freeTextField3],
        [],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkOceanicRequestPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.flightId = Subject.create("");
    this.facility = Subject.create("");
    this.entryPoint = Subject.create("");
    this.time = Subject.create("");
    this.mach = Subject.create("");
    this.fltLvl = Subject.create("");
    this.send = Subject.create(false);

    for (let i = 0; i < 4; i++) {
      this[`freeText${i}`] = Subject.create("");
      this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "(----------------------)[blue]",
          maxLength: 24,
        }),
        onSelected: async (scratchpadContents) => {
          this[`freeText${i}`].set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this[`freeText${i}`]);
    }

    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          const freeText = Array(4)
            .fill()
            .map((_, i) => this[`freeText${i}`].get())
            .filter((e) => e && e.length)
            .join(" ");
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendOceanicClearance",
              arguments: [
                this.flightId.get(),
                this.facility.get(),
                this.entryPoint.get(),
                this.time.get(),
                this.fltLvl.get(),
                this.mach.get(),
                freeText,
              ],
            },
            true,
            false,
          );

          [
            this.facility,
            this.entryPoint,
            this.time,
            this.fltLvl,
            this.mach,
          ].forEach((e) => e.set(""));
          Array(4)
            .fill()
            .forEach((_, i) => this[`freeText${i}`].set(""));

          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);

    this.flightIdField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□",
        maxLength: 7,
      }),
      onSelected: async (scratchpadContents) => {
        this.flightId.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.flightId);
    this.facilityField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□□□□□",
        maxLength: 11,
      }),
      onSelected: async (scratchpadContents) => {
        this.facility.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.facility);

    this.entryPointField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□□□□□",
        maxLength: 11,
      }),
      onSelected: async (scratchpadContents) => {
        this.entryPoint.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.entryPoint);

    this.timeField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□:□□",
        maxLength: 11,
      }),
      onSelected: async (scratchpadContents) => {
        if (
          !scratchpadContents.length === 4 ||
          Number.isNaN(Number.parseInt(scratchpadContents))
        ) {
          return false;
        }
        this.time.set(
          `${scratchpadContents.substr(0, 2)}:${scratchpadContents.substr(2)}`,
        );
        this.checkReady();
        return true;
      },
    }).bind(this.time);

    this.machField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: ".□□",
        maxLength: 3,
      }),
      onSelected: async (scratchpadContents) => {
        if (
          !scratchpadContents.length > 3 ||
          Number.isNaN(Number.parseFloat("0" + scratchpadContents))
        ) {
          return false;
        }
        this.mach.set(`.${scratchpadContents.replace(".", "")}`);
        this.checkReady();
        return true;
      },
    }).bind(this.mach);
    this.fltLvlField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□",
        maxLength: 3,
      }),
      onSelected: async (scratchpadContents) => {
        if (
          !scratchpadContents.length > 3 ||
          Number.isNaN(Number.parseInt(scratchpadContents))
        ) {
          return false;
        }
        this.fltLvl.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.fltLvl);

    this.bus
      .getSubscriber()
      .on("fplOriginDestChanged")
      .handle((evt) => {
        this.flightId.set(
          wt21Shared.FmcUserSettings.getManager(this.bus)
            .getSetting("flightNumber")
            .get(),
        );
      });
    this.flightId.set(
      wt21Shared.FmcUserSettings.getManager(this.bus)
        .getSetting("flightNumber")
        .get(),
    );
  }
  checkReady() {
    const array = [
      this.facility,
      this.flightId,
      this.entryPoint,
      this.time,
      this.mach,
      this.fltLvl,
    ];
    this.send.set(
      !array.find((e) => {
        const v = e.get();
        return !v || !v.length;
      }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "OCEANIC CLX RQ[blue]"],
        ["ATS FLT ID[blue]", "FACILITY[blue]"],
        [this.flightIdField, this.facilityField],
        ["ENRTY POINT[blue]", "AT TIME[blue]"],
        [this.entryPointField, this.timeField],
        ["MACH[blue]", "FLT LEVEL[blue]"],
        [this.machField, this.fltLvlField],
        [""],
        [],
        [""],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "DEPART CLX REQ[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        [this.freeTextField3],
        [],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkTelexPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    try {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = FmcCmuCommons.createClockField(this, this.bus);
      this.facility = Subject.create("");
      this.send = Subject.create(false);

      for (let i = 0; i < 7; i++) {
        this[`freeText${i}`] = Subject.create("");
        this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
          formatter: new StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24,
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          },
        }).bind(this[`freeText${i}`]);
      }

      this.sendButton = new msfsSdk.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          },
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(7)
              .fill()
              .map((_, i) => this[`freeText${i}`].get())
              .filter((e) => e && e.length)
              .join(" ");
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendTelex",
                arguments: [this.facility.get(), freeText],
              },
              true,
              false,
            );
            [this.facility].forEach((e) => e.set(""));
            Array(7)
              .fill()
              .forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        },
      }).bind(this.send);

      this.facilityField = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "□□□□□□□",
          maxLength: 7,
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.facility);
    } catch (err) {
      console.log("error");
    }
  }
  checkReady() {
    const array = [this.facility];
    const freeText = Array(7)
      .fill()
      .map((_, i) => this[`freeText${i}`].get())
      .filter((e) => e && e.length)
      .join(" ");
    this.send.set(
      freeText.length &&
        !array.find((e) => {
          const v = e.get();
          return !v || !v.length;
        }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "AIR TO AIR MSG[blue]"],
        ["FACILITY[blue]"],
        [this.facilityField],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        ["", this.sendButton],
        [],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "AIR TO AIR MSG[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField3],
        [],
        [this.freeTextField4],
        [],
        [this.freeTextField5],
        [],
        [this.freeTextField6],
        [],
        ["", this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkStatusPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.facility = Subject.create("");
    this.send = Subject.create("NOTIFY");
    this.status = Subject.create(null);
    this.activeStation = Subject.create("");

    this.facilityField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□□□□□□□",
        maxLength: 11,
      }),
      onSelected: async (scratchpadContents) => {
        this.facility.set(scratchpadContents);

        return true;
      },
      onDelete: async () => {
        if (!this.activeStation.get()) {
          this.facility.set("");
          this.send.set("NOTIFY");
        }
      },
    }).bind(this.facility);
    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "",
        /** @inheritDoc */
        format(value) {
          return `<${value}[blue]`;
        },
      },
      onSelected: async () => {
        if (this.activeStation.get()) {
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendLogoffRequest",
              arguments: [],
            },
            true,
            false,
          );
        } else {
          if (this.facility.get().length)
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendLogonRequest",
                arguments: [this.facility.get()],
              },
              true,
              false,
            );
        }
        return true;
      },
    }).bind(this.send);
    this.statusField = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "----",
        /** @inheritDoc */
        format(value) {
          return value;
        },
      },
    }).bind(this.status);

    this.bus
      .getSubscriber()
      .on("acars_station_status")
      .handle((message) => {
        if (message.active) {
          this.status.set(`${message.active}[green]`);
          this.activeStation.set(true);
          this.send.set("LOGOFF");
          this.facility.set("");
        } else {
          if (message.pending) {
            this.status.set(`${message.pending} NOTIFIED[green]`);
            this.send.set("NOTIFY AGAIN");
          } else {
            this.send.set("NOTIFY");
            this.status.set(null);
          }
          this.activeStation.set(false);
        }
        this.invalidate();
      });
  }

  render() {
    return [
      [
        ["DL[blue]", "", "STATUS[blue]"],
        ["FACILITY[blue]"],
        [this.facilityField],
        ["STATUS[blue]"],
        [this.statusField],
        [],
        [this.sendButton],
        [],
        [],
        [],
        [],
        [],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkDirectToPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.facility = Subject.create("");
    this.send = Subject.create(false);
    this.reason = Subject.create(0);
    this.opts = ["WEATHER", "A/C PERF"];
    this.station = Subject.create(null);
    this.bus
      .getSubscriber()
      .on("acars_station_status")
      .handle((message) => {
        this.station.set(message.active);
        this.checkReady();

        this.invalidate();
      });

    this.stationField = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "----",
        /** @inheritDoc */
        format(value) {
          return `${value}[blue]`;
        },
      },
    }).bind(this.station);
    for (let i = 0; i < 4; i++) {
      this[`freeText${i}`] = Subject.create("");
      this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "(----------------------)[blue]",
          maxLength: 24,
        }),
        onSelected: async (scratchpadContents) => {
          this[`freeText${i}`].set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this[`freeText${i}`]);
    }
    fetchAcarsStatus(this.bus).then((res) => {
      this.station.set(res.active);
      this.invalidate();
    });
    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          const freeText = Array(4)
            .fill()
            .map((_, i) => this[`freeText${i}`].get())
            .filter((e) => e && e.length)
            .join(" ");
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendDirectTo",
              arguments: [
                this.facility.get(),
                this.reason.get() === 0 ? "weather" : "performance",
                freeText,
              ],
            },
            true,
            false,
          );

          [this.facility].forEach((e) => e.set(""));
          Array(4)
            .fill()
            .forEach((_, i) => this[`freeText${i}`].set(""));
          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);

    this.facilityField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□□",
        maxLength: 5,
      }),
      onSelected: async (scratchpadContents) => {
        this.facility.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.facility);
    this.reasonField = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.opts,
      activeStyle: "green",
    }).bind(this.reason);
  }
  checkReady() {
    const array = [this.facility, this.station];
    this.send.set(
      !array.find((e) => {
        const v = e.get();
        return !v || !v.length;
      }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "DIRECT CLX REQ[blue]"],
        ["WAYPOINT[blue]"],
        [this.facilityField],
        ["REASON[blue]"],
        [this.reasonField],
        [],
        [],
        [],
        [],
        [""],
        [this.stationField, this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "DIRECT CLX REQ[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        [this.freeTextField3],
        [],
        [this.stationField, this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkSpeedPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.send = Subject.create(false);
    this.value = Subject.create("");
    this.reason = Subject.create(0);
    this.unit = Subject.create(0);
    this.opts = ["WEATHER", "A/C PERF"];
    this.units = ["KTS", "MACH"];
    this.station = Subject.create(null);
    this.bus
      .getSubscriber()
      .on("acars_station_status")
      .handle((message) => {
        this.station.set(message.active);
        this.checkReady();
        this.invalidate();
      });

    this.stationField = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "----",
        /** @inheritDoc */
        format(value) {
          return `${value}[blue]`;
        },
      },
    }).bind(this.station);

    for (let i = 0; i < 4; i++) {
      this[`freeText${i}`] = Subject.create("");
      this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "(----------------------)[blue]",
          maxLength: 24,
        }),
        onSelected: async (scratchpadContents) => {
          this[`freeText${i}`].set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this[`freeText${i}`]);
    }

    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          const freeText = Array(4)
            .fill()
            .map((_, i) => this[`freeText${i}`].get())
            .filter((e) => e && e.length)
            .join(" ");
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendSpeedChange",
              arguments: [
                this.unit.get() === 0 ? "knots" : "mach",
                this.value.get(),
                this.reason.get() === 0 ? "weather" : "performance",
                freeText,
              ],
            },
            true,
            false,
          );

          [this.value].forEach((e) => e.set(""));
          Array(4)
            .fill()
            .forEach((_, i) => this[`freeText${i}`].set(""));
          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);
    fetchAcarsStatus(this.bus).then((res) => {
      this.station.set(res.active);
      this.invalidate();
    });
    this.speedField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□□",
        maxLength: 4,
        format(value) {
          return `${this.unit.get() === 1 ? "M" : ""}${value}`;
        },
      }),
      onSelected: async (scratchpadContents) => {
        if (Number.isNaN(Number.parseFloat(scratchpadContents))) return false;
        this.value.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.value);
    this.reasonField = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.opts,
      activeStyle: "green",
    }).bind(this.reason);
    this.unitField = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.units,
      activeStyle: "green",
    }).bind(this.unit);
  }
  checkReady() {
    const array = [this.value, this.station];
    this.send.set(
      !array.find((e) => {
        const v = e.get();
        return typeof v === "string" ? v.length === 0 : false;
      }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "SPEED CLX REQ[blue]"],
        ["SPEED[blue]", "UNIT[blue]"],
        [this.speedField, this.unitField],
        ["REASON[blue]"],
        [this.reasonField],
        [],
        [],
        [],
        [],
        [""],
        [this.stationField, this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "SPEED CLX REQ[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        [this.freeTextField3],
        [],
        [this.stationField, this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkLevelPage extends WT21FmcPage {
  constructor(
    bus,
    screen,
    props,
    fms,
    /** @deprecated */
    baseInstrument, // TODO we should really not have this here
    renderCallback,
  ) {
    super(bus, screen, props, fms, baseInstrument, renderCallback);
    this.clockField = FmcCmuCommons.createClockField(this, this.bus);
    this.send = Subject.create(false);
    this.value = Subject.create("");
    this.reason = Subject.create(0);
    this.unit = Subject.create(0);
    this.opts = ["WEATHER", "A/C PERF"];
    this.units = ["CLIMB", "DESCEND"];
    this.station = Subject.create(null);
    this.bus
      .getSubscriber()
      .on("acars_station_status")
      .handle((message) => {
        this.station.set(message.active);
        this.checkReady();
        this.invalidate();
      });

    this.stationField = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "----",
        /** @inheritDoc */
        format(value) {
          return `${value}[blue]`;
        },
      },
    }).bind(this.station);

    fetchAcarsStatus(this.bus).then((res) => {
      this.station.set(res.active);
      this.invalidate();
    });

    for (let i = 0; i < 4; i++) {
      this[`freeText${i}`] = Subject.create("");
      this[`freeTextField${i}`] = new msfsSdk.TextInputField(this, {
        formatter: new StringInputFormat({
          nullValueString: "(----------------------)[blue]",
          maxLength: 24,
        }),
        onSelected: async (scratchpadContents) => {
          this[`freeText${i}`].set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this[`freeText${i}`]);
    }

    this.sendButton = new msfsSdk.DisplayField(this, {
      formatter: {
        nullValueString: "SEND",
        /** @inheritDoc */
        format(value) {
          return `SEND[${value ? "blue" : "white"}]`;
        },
      },
      onSelected: async () => {
        if (this.send.get()) {
          const freeText = Array(4)
            .fill()
            .map((_, i) => this[`freeText${i}`].get())
            .filter((e) => e && e.length)
            .join(" ");
          this.bus.getPublisher().pub(
            "acars_message_send",
            {
              key: "sendLevelChange",
              arguments: [
                this.value.get(),
                this.unit.get() === 0,
                this.reason.get() === 0 ? "weather" : "performance",
                freeText,
              ],
            },
            true,
            false,
          );

          [this.value].forEach((e) => e.set(""));
          Array(4)
            .fill()
            .forEach((_, i) => this[`freeText${i}`].set(""));
          this.checkReady();
        }
        return true;
      },
    }).bind(this.send);

    this.levelField = new msfsSdk.TextInputField(this, {
      formatter: new StringInputFormat({
        nullValueString: "□□□",
        maxLength: 3,
        format(value) {
          return `FL${value}`;
        },
      }),
      onSelected: async (scratchpadContents) => {
        if (scratchpadContents.startsWith("FL"))
          scratchpadContents = scratchpadContents.substr(2);
        if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
        this.value.set(scratchpadContents);
        this.checkReady();
        return true;
      },
    }).bind(this.value);
    this.reasonField = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.opts,
      activeStyle: "green",
    }).bind(this.reason);
    this.unitField = new msfsSdk.SwitchLabel(this, {
      optionStrings: this.units,
      activeStyle: "green",
    }).bind(this.unit);
  }
  checkReady() {
    const array = [this.value, this.station];
    this.send.set(
      !array.find((e) => {
        const v = e.get();
        return v === null || typeof v === "string" ? v.length === 0 : false;
      }),
    );
  }
  render() {
    return [
      [
        ["DL[blue]", this.PagingIndicator, "LEVEL CLX REQ[blue]"],
        ["FL[blue]", "DIR[blue]"],
        [this.levelField, this.unitField],
        ["REASON[blue]"],
        [this.reasonField],
        [],
        [],
        [],
        [],
        [],
        [this.stationField, this.sendButton],
        [""],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
      [
        ["DL[blue]", this.PagingIndicator, "LEVEL CLX REQ[blue]"],
        [" REMARKS[blue]"],
        [this.freeTextField0],
        [],
        [this.freeTextField1],
        [],
        [this.freeTextField2],
        [],
        [this.freeTextField3],
        [],
        [this.stationField, this.sendButton],
        [],
        [
          PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

export class DatalinkPosReportPage extends WT21FmcPage {
  constructor() {
    super(...arguments);
    try {
      this.clockField = FmcCmuCommons.createClockField(this, this.bus);
      this.distance = Subject.create(0);
      this.groundSpeed = Subject.create(0);

      this.speed = Subject.create(
        `${SimVar.GetSimVarValue("AIRSPEED MACH", "mach").toFixed(1)}`,
      );
      this.speedField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: ".--",
          maxLength: 3,
          format(value) {
            return `M.${value}[blue]`;
          },
          async parse(input) {
            return input;
          },
        },
        onModified: async (scratchpadContents) => {
          if (scratchpadContents.startsWith("M"))
            scratchpadContents = scratchpadContents.substr(1);
          if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
          this.speed.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.speed);
      // const fp = this.fms.getPrimaryFlightPlan();
      // const activeLeg = fp ? fp.getLeg(fp.activeLateralLeg) : null;
      this.waypoint = Subject.create("");
      this.waypointField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "-----",
          maxLength: 5,
          format(value) {
            return value ? `${value}[blue]` : this.nullValueString;
          },
          async parse(input) {
            return input;
          },
        },
        onModified: async (scratchpadContents) => {
          this.waypoint.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.waypoint);
      // const activeLeg2 = fp ? fp.getLeg(fp.activeLateralLeg + 1) : null;
      this.fWaypoint = Subject.create("");
      this.fWaypointField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "-----",
          maxLength: 5,
          format(value) {
            return value ? `${value}[blue]` : this.nullValueString;
          },
          async parse(input) {
            return input;
          },
        },
        onModified: async (scratchpadContents) => {
          this.fWaypoint.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.fWaypoint);

      // const activeLeg3 = fp ? fp.getLeg(fp.activeLateralLeg + 2) : null;
      this.nWaypoint = Subject.create("");
      this.nWaypointField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "-----",
          maxLength: 5,
          format(value) {
            return value ? `${value}[blue]` : this.nullValueString;
          },
          async parse(input) {
            return input;
          },
        },
        onModified: async (scratchpadContents) => {
          this.nWaypoint.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.nWaypoint);

      this.ata = Subject.create(null);
      this.ataField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "--:--",
          maxLength: 5,
          format(value) {
            return value
              ? `${value.substr(0, 2)}:${value.substr(2)}[blue]`
              : this.nullValueString;
          },
          async parse(input) {
            return input.replace("Z", "");
          },
        },
        onModified: async (scratchpadContents) => {
          if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
          this.ata.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.ata);

      this.eta = Subject.create(null);
      this.etaField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "--:--",
          maxLength: 5,
          format(value) {
            return value
              ? `${value.substr(0, 2)}:${value.substr(2)}[blue]`
              : this.nullValueString;
          },
          async parse(input) {
            return input.replace("Z", "");
          },
        },
        onModified: async (scratchpadContents) => {
          if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
          this.eta.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.eta);

      this.send = Subject.create(false);

      this.station = Subject.create(null);
      this.bus
        .getSubscriber()
        .on("acars_station_status")
        .handle((message) => {
          this.station.set(message.active);
          this.checkReady();
          this.invalidate();
        });

      this.stationField = new msfsSdk.DisplayField(this, {
        formatter: {
          nullValueString: "----",
          /** @inheritDoc */
          format(value) {
            return `${value}[blue]`;
          },
        },
      }).bind(this.station);

      fetchAcarsStatus(this.bus)
        .then((res) => {
          this.station.set(res.active);
          this.invalidate();
        })
        .catch((err) => null);
      this.value = Subject.create(null);
      this.levelField = new msfsSdk.TextInputField(this, {
        formatter: {
          nullValueString: "---",
          maxLength: 3,
          format(value) {
            return `FL${value}[blue]`;
          },
          async parse(input) {
            return input;
          },
        },
        onModified: async (scratchpadContents) => {
          if (scratchpadContents.startsWith("FL"))
            scratchpadContents = scratchpadContents.substr(2);
          if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
          this.value.set(scratchpadContents);
          this.checkReady();
          return true;
        },
      }).bind(this.value);

      this.sendButton = new msfsSdk.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          },
        },
        onSelected: async () => {
          if (this.send.get()) {
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendPositionReport",
                arguments: [
                  this.value.get(),
                  this.speed.get(),
                  this.waypoint.get(),
                  this.ata.get(),
                  this.fWaypoint.get(),
                  this.eta.get(),
                  this.nWaypoint.get(),
                ],
              },
              true,
              false,
            );

            this.checkReady();
          }
          return true;
        },
      }).bind(this.send);
      this.distanceSub = this.bus
        .getSubscriber()
        .on("lnavdata_waypoint_distance")
        .handle((v) => {
          this.distance.set(v);
          this.updatePosData();
        });
      this.speedSub = this.bus
        .getSubscriber()
        .on("ground_speed")
        .handle((v) => {
          this.groundSpeed.set(v);
          this.updatePosData();
        });
    } catch (err) {
      console.log(err);
    }
  }
  checkReady() {
    const array = [
      this.waypoint,
      this.fWaypoint,
      this.nWaypoint,
      this.ata,
      this.eta,
      this.speed,
      this.value,
      this.station,
    ];
    this.send.set(
      !array.find((e) => {
        if (!e) return true;
        const v = e.get();

        return v === null || (typeof v === "string" ? v.length === 0 : false);
      }),
    );
  }
  onDestroy() {
    this.speedSub.destroy();
    this.distanceSub.destroy();
  }
  onPause() {
    this.speedSub.pause();
    this.distanceSub.pause();
  }
  onResume() {
    this.speedSub.resume();
    this.distanceSub.resume();
  }
  updatePosData() {
    const gs = this.groundSpeed.get();
    const distance = this.distance.get();
    const fp = this.fms.getPrimaryFlightPlan();
    if (!gs || !distance || !fp) return;

    {
      const activeLeg = fp.getLeg(fp.activeLateralLeg);
      if (activeLeg) this.waypoint.set(activeLeg.name);
    }
    {
      const activeLeg = fp.getLeg(fp.activeLateralLeg + 1);
      if (activeLeg) this.fWaypoint.set(activeLeg.name);
    }
    {
      const activeLeg = fp.getLeg(fp.activeLateralLeg + 2);
      if (activeLeg) this.nWaypoint.set(activeLeg.name);
    }

    {
      const time = new Date();
      const rem = 60 * (distance / gs);
      time.setUTCHours(time.getUTCHours() + Math.floor(rem / 60));
      time.setUTCMinutes(time.getUTCMinutes() + Math.floor(rem % 60));
      this.ata.set(
        `${time.getUTCHours().toString().padStart(2, "0")}${time.getUTCMinutes().toString().padStart(2, "0")}`,
      );
    }
    {
      const leg = fp.getLeg(fp.activeLateralLeg + 1);
      if (leg) {
        const time = new Date();
        const rem =
          60 *
          ((this.distance.get() + leg.calculated.distance / 1852) /
            this.groundSpeed.get());
        time.setUTCHours(time.getUTCHours() + Math.floor(rem / 60));
        time.setUTCMinutes(time.getUTCMinutes() + Math.floor(rem % 60));
        this.eta.set(
          `${time.getUTCHours().toString().padStart(2, "0")}${time.getUTCMinutes().toString().padStart(2, "0")}`,
        );
      }
    }
    {
      const v = SimVar.GetSimVarValue("INDICATED ALTITUDE", "feet");
      this.value.set((v / 100).toFixed(0));
    }
    this.checkReady();
  }
  render() {
    return [
      [
        ["", this.PagingIndicator, "POS REPORT"],
        ["MACH", "FL"],
        [this.speedField, this.levelField],
        ["INBOUND", "ATA"],
        [this.waypointField, this.ataField],
        ["NEXT", "ETA"],
        [this.fWaypointField, this.etaField],
        ["AFTER", ""],
        [this.nWaypointField, ""],
        [],
        [this.stationField, this.sendButton],
        [],
        [
          PageLinkField.createLink(this, "<ATC INDEX", "/datalink-menu"),
          "",
          this.clockField,
        ],
      ],
    ];
  }
}

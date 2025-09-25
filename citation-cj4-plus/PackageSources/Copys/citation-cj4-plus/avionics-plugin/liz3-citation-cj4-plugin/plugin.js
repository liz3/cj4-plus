
       function require(m) {
         const MODS = {
          "@microsoft/msfs-sdk": window.msfssdk,
          "@microsoft/msfs-wt21-fmc": window.wt21_fmc,
          "@microsoft/msfs-wt21-shared": window.wt21_shared
         }
        if(MODS[m])
          return MODS[m];
         throw new Error(`Unknown module ${m}`);
       }
    
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/app.mjs
  var import_msfs_wt21_fmc6 = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_sdk6 = __toESM(__require("@microsoft/msfs-sdk"), 1);
  var import_msfs_wt21_shared5 = __toESM(__require("@microsoft/msfs-wt21-shared"), 1);

  // src/CduRenderer.mjs
  var MF_CAPT_URL = "ws://localhost:8320/winwing/cdu-captain";
  var MF_FO_URL = "ws://localhost:8320/winwing/cdu-co-pilot";
  var MF_CDU_ROWS = 14;
  var MF_CDU_COLS = 24;
  var MfCharSize = Object.freeze({
    Large: 0,
    Small: 1
  });
  var MfColour = Object.freeze({
    Amber: "a",
    Brown: "o",
    Cyan: "c",
    Green: "g",
    Grey: "e",
    Khaki: "k",
    Magenta: "m",
    Red: "r",
    White: "w",
    Yellow: "y"
  });
  var CduRenderer = class {
    constructor(renderer, binder) {
      this.renderer = renderer;
      this.binder = binder;
      this.active = GetStoredData("cj4_plus_winwing_setting") === "true";
      this.rowData = Array.from({ length: MF_CDU_ROWS * MF_CDU_COLS }, () => []);
      this.socketUri = !!this.binder.isPrimaryInstrument ? MF_CAPT_URL : MF_FO_URL;
      this.binder.bus.getSubscriber().on("simTime").atFrequency(4).handle(() => this.update());
      this.binder.bus.getSubscriber().on("cj4_plus_winwing_setting").handle((v) => {
        this.active = v;
        if (!this.active) {
          if (this.socket) {
            try {
              this.socket.close();
            } catch (err) {
            }
            this.socket = null;
          }
        } else {
          this.connect();
        }
      });
      const oldRenderToDom = renderer.renderToDom.bind(renderer);
      renderer.renderToDom = (...args) => {
        oldRenderToDom(...args);
        this.needsUpdate = true;
      };
      this.charMap = {
        "\xA0": " ",
        "\u25A1": "\u2610",
        "\u2B26": "\xB0"
      };
      this.charRegex = new RegExp(`[${Object.keys(this.charMap).join("")}]`);
      this.colourMap = /* @__PURE__ */ new Map([
        ["blue", MfColour.Cyan],
        ["green", MfColour.Green],
        ["disabled", MfColour.Grey],
        ["magenta", MfColour.Magenta],
        ["yellow", MfColour.Yellow],
        ["white", MfColour.White]
      ]);
      if (this.active)
        this.connect();
    }
    connect() {
      this.socket = new WebSocket(this.socketUri);
      this.socket.onerror = () => {
        try {
          this.socket.close();
        } catch (err) {
        }
        if (this.active)
          setTimeout(() => {
            this.connect();
          }, 5e3);
      };
      this.socket.onopen = () => {
        this.needsUpdate = true;
      };
    }
    update() {
      if (!this.needsUpdate) return;
      this.needsUpdate = false;
      for (let r = 0; r < this.renderer.options.screenCellHeight && r < MF_CDU_ROWS; r++) {
        for (let c = 0; c < this.renderer.options.screenCellWidth && c < MF_CDU_COLS; c++) {
          this.copyWtColDataToOutput(r, c);
        }
      }
      if (this.isScratchpadBlank()) {
        const bottomMessage = this.getBottomMessage();
        let outputIndex = this.getFirstScratchpadIndex();
        for (let i = 0; i < bottomMessage.length; i++, outputIndex++) {
          this.rowData[outputIndex][0] = bottomMessage[i];
        }
      }
      if (this.socket && this.socket.readyState === 1) {
        this.socket.send(
          JSON.stringify({ Target: "Display", Data: this.rowData })
        );
      }
    }
    copyWtColDataToOutput(rowIndex, colIndex) {
      const outputIndex = rowIndex * MF_CDU_COLS + colIndex;
      const cellData = this.renderer.columnData[rowIndex][colIndex];
      this.rowData[outputIndex][0] = cellData.content.replace(
        this.charRegex,
        (c) => this.charMap[c]
      );
      this.rowData[outputIndex][1] = this.getColour(cellData);
      this.rowData[outputIndex][2] = rowIndex % 2 === 1 && rowIndex !== MF_CDU_ROWS - 1 || cellData.styles.includes("s-text") ? MfCharSize.Small : MfCharSize.Large;
    }
    getBottomMessage() {
      if (!this.renderer) {
        return "";
      }
      const row = this.renderer.options.screenCellHeight - 1;
      return this.renderer.columnData[row].reduce((msg, cell) => msg += cell.content, "").replace(/EXEC$/, "").trim();
    }
    getFirstScratchpadIndex() {
      return (MF_CDU_ROWS - 1) * MF_CDU_COLS + 1;
    }
    isScratchpadBlank() {
      const firstScratchpadIndex = this.getFirstScratchpadIndex();
      const lastScratchpadIndex = firstScratchpadIndex + MF_CDU_COLS - 2;
      for (let i = firstScratchpadIndex; i < lastScratchpadIndex; i++) {
        if (this.rowData[i] && this.rowData[i][0] != " ") {
          return false;
        }
      }
      return true;
    }
    getColour(cellData) {
      for (let k of this.colourMap.keys()) {
        if (cellData.styles.includes(k)) {
          return this.colourMap.get(k);
        }
      }
      return MfColour.White;
    }
  };
  var CduRenderer_default = CduRenderer;

  // src/SettingsExtension.mjs
  var import_msfs_wt21_fmc = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_sdk = __toESM(__require("@microsoft/msfs-sdk"), 1);
  var PlusSettingsExtension = class extends import_msfs_sdk.AbstractFmcPageExtension {
    constructor(page) {
      super(page);
      this.simbriefId = import_msfs_sdk.Subject.create(GetStoredData("cj4_plus_simbrief_id"));
      this.hoppieId = import_msfs_sdk.Subject.create(GetStoredData("cj4_plus_hoppie_code"));
      this.cduSetting = import_msfs_sdk.Subject.create(GetStoredData("cj4_plus_winwing_setting") === "true" ? 1 : 0);
      this.cduSwitch = new import_msfs_sdk.default.SwitchLabel(page, {
        optionStrings: ["OFF", "ON"],
        activeStyle: "green"
      }).bind(this.cduSetting);
      this.cduSetting.sub((v) => {
        SetStoredData("cj4_plus_winwing_setting", v === 1 ? "true" : "false");
        page.bus.getPublisher().pub("cj4_plus_winwing_setting", v === 1);
      });
      this.simbriefField = new import_msfs_sdk.default.TextInputField(page, {
        formatter: new import_msfs_wt21_fmc.StringInputFormat({ nullValueString: "-----" }),
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
        prefix: ""
      }).bind(this.simbriefId);
      this.hoppieField = new import_msfs_sdk.default.TextInputField(page, {
        formatter: new import_msfs_wt21_fmc.StringInputFormat({ nullValueString: "-----", maxLength: 20 }),
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
              if (s)
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
        prefix: ""
      }).bind(this.hoppieId);
    }
    onPageRendered(renderedTemplates) {
      renderedTemplates[0][9] = [" SIMBRIEF ID[blue]", "WINWING CDU[blue]"];
      renderedTemplates[0][10] = [this.simbriefField, this.cduSwitch];
      renderedTemplates[0][11] = [" HOPPIE CODE[blue]"];
      renderedTemplates[0][12] = [this.hoppieField];
    }
  };
  var SettingsExtension_default = PlusSettingsExtension;

  // src/RouteMenuExtension.mjs
  var import_msfs_wt21_fmc2 = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_sdk2 = __toESM(__require("@microsoft/msfs-sdk"), 1);
  var import_msfs_wt21_shared = __toESM(__require("@microsoft/msfs-wt21-shared"), 1);
  var RouteMenuExtension = class extends import_msfs_sdk2.AbstractFmcPageExtension {
    constructor(page) {
      super(page);
      this.simbriefId = import_msfs_sdk2.Subject.create(GetStoredData("cj4_plus_simbrief_id"));
      this.fetchSimbrief = new import_msfs_sdk2.default.DisplayField(page, {
        formatter: new import_msfs_wt21_fmc2.SimpleStringFormat("<FPLN RECALL"),
        onSelected: async () => {
          return this.loadAndInsertFpln(page, this.simbriefId.get());
        }
      });
      page.bus.getSubscriber().on("simbrief_id").handle((v) => {
        this.simbriefId.set(v);
      });
    }
    async loadAndInsertFpln(page, id) {
      try {
        const response = await fetch(
          `https://www.simbrief.com/api/xml.fetcher.php?json=1&userid=${id}`
        );
        const json = await response.json();
        const fms = page.fms;
        const actions = [];
        actions.push(() => fms.emptyModFlightPlan(true));
        import_msfs_wt21_shared.default.FmcUserSettings.getManager(this.bus).getSetting("flightNumber").set(json.general.flight_number);
        let results = await fms.facLoader.searchByIdent(
          import_msfs_sdk2.default.FacilitySearchType.Airport,
          json.origin.icao_code,
          1
        );
        if (results && results.length === 1) {
          const facility = await fms.facLoader.getFacility(
            import_msfs_sdk2.default.FacilityType.Airport,
            results[0]
          );
          if (facility) {
            actions.push(() => fms.setOrigin(facility));
          }
        }
        results = await fms.facLoader.searchByIdent(
          import_msfs_sdk2.default.FacilitySearchType.Airport,
          json.destination.icao_code,
          1
        );
        if (results && results.length === 1) {
          const facility = await fms.facLoader.getFacility(
            import_msfs_sdk2.default.FacilityType.Airport,
            results[0]
          );
          if (facility) {
            actions.push(() => fms.setDestination(facility));
          }
        }
        results = await fms.facLoader.searchByIdent(
          import_msfs_sdk2.default.FacilitySearchType.Airport,
          json.alternate.icao_code,
          1
        );
        if (results && results.length === 1) {
          const facility = await fms.facLoader.getFacility(
            import_msfs_sdk2.default.FacilityType.Airport,
            results[0]
          );
          if (facility) {
            actions.push(() => fms.setFlightPlanAlternate(facility));
          }
        }
        const idx = fms.ensureOnlyOneSegmentOfType(
          0,
          import_msfs_sdk2.FlightPlanSegmentType.Enroute,
          true
        );
        for (const entry of json.navlog.fix) {
          if (entry.is_sid_star === "1" || entry.type === "ltlg") continue;
          const results2 = await fms.facLoader.searchByIdent(
            import_msfs_sdk2.default.FacilitySearchType.All,
            entry.ident
          );
          let found = null;
          const lat = Number.parseFloat(entry.pos_lat);
          const lon = Number.parseFloat(entry.pos_long);
          for (const icao of results2) {
            const fac = await fms.facLoader.getFacility(
              import_msfs_sdk2.default.ICAO.getFacilityType(icao),
              icao
            );
            if (entry.type === "vor" && fac.name === entry.name) {
              found = fac;
              break;
            }
            if (lon.toFixed(4) === fac.lon.toFixed(4) && lat.toFixed(4) === fac.lat.toFixed(4)) {
              found = fac;
              break;
            }
          }
          if (!found) throw `Couldnt find ${entry.ident}`;
          actions.push(() => fms.insertWaypoint(found, idx));
        }
        for (const a of actions) a();
        page.bus.getPublisher().pub(
          "fmc_new_message",
          new import_msfs_wt21_shared.default.Message(
            "FPLN UPLNK INSERTED",
            import_msfs_wt21_shared.default.MESSAGE_LEVEL.White,
            999,
            import_msfs_wt21_shared.default.MESSAGE_TARGET.FMC,
            import_msfs_wt21_shared.default.FMS_MESSAGE_ID.DLFPLNLOADED
          ),
          false,
          false
        );
        return "";
      } catch (err) {
        throw "UPKLNK LOAD FAILED";
      }
    }
    onPageRendered(renderedTemplates) {
      const elem = this.simbriefId.get();
      renderedTemplates[0][6] = [
        elem && elem.length ? this.fetchSimbrief : "<FPLN RECALL[disabled]"
      ];
    }
  };
  var RouteMenuExtension_default = RouteMenuExtension;

  // src/DatalinkPageExtension.mjs
  var import_msfs_wt21_fmc3 = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_sdk3 = __toESM(__require("@microsoft/msfs-sdk"), 1);
  var DatalinkPageExtension = class extends import_msfs_sdk3.AbstractFmcPageExtension {
    constructor(page) {
      super(page);
    }
    onPageRendered(renderedTemplates) {
      renderedTemplates[0][4][1] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "DEPART CLX>",
        "/datalink-extra/predep"
      );
      renderedTemplates[0][6][1] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "OCEANIC CLX>",
        "/datalink-extra/oceanic"
      );
      renderedTemplates[0][8][1] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "AIR TO AIR MSG>",
        "/datalink-extra/telex"
      );
      renderedTemplates[0][2][0] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "<RCVD MSGS",
        "/datalink-extra/recv-msgs"
      );
      renderedTemplates[0][4][0] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "<SEND MSGS",
        "/datalink-extra/send-msgs"
      );
      renderedTemplates[0][10][0] = import_msfs_sdk3.PageLinkField.createLink(
        this.page,
        "<ATIS",
        "/datalink-extra/atis"
      );
      renderedTemplates[1] = [
        renderedTemplates[0][0],
        [],
        [
          import_msfs_sdk3.PageLinkField.createLink(
            this.page,
            "<STATUS",
            "/datalink-extra/cpdlc/status"
          ),
          import_msfs_sdk3.PageLinkField.createLink(
            this.page,
            "DIRECT CLX>",
            "/datalink-extra/cpdlc/direct"
          )
        ],
        [],
        [
          import_msfs_sdk3.PageLinkField.createLink(
            this.page,
            "<SPEED CLX",
            "/datalink-extra/cpdlc/speed"
          ),
          import_msfs_sdk3.PageLinkField.createLink(
            this.page,
            "LEVEL CLX>",
            "/datalink-extra/cpdlc/level"
          )
        ],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        renderedTemplates[0][12]
      ];
      renderedTemplates[0][0][1] = this.page.PagingIndicator;
      renderedTemplates[1][0][1] = this.page.PagingIndicator;
    }
  };
  var DatalinkPageExtension_default = DatalinkPageExtension;

  // src/DatalinkPages.mjs
  var import_msfs_wt21_fmc4 = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_wt21_shared3 = __toESM(__require("@microsoft/msfs-wt21-shared"), 1);
  var import_msfs_sdk4 = __toESM(__require("@microsoft/msfs-sdk"), 1);

  // src/Hoppie.mjs
  var parseMessages = (input) => {
    const messagePattern = /\{(\w+)\s+(\w+)\s+\{([^}]+)\}\}/g;
    let match;
    const messages = [];
    while ((match = messagePattern.exec(input)) !== null) {
      const message = {
        ts: Date.now(),
        from: match[1],
        type: match[2],
        payload: match[3]
      };
      if (message.type === "cpdlc" || message.type === "telex") {
        const parts = message.payload.split("/");
        if (message.type === "cpdlc") {
          message.cpdlc = {
            protocol: parts[1],
            min: parts[2],
            mrn: parts[3],
            ra: parts[4],
            content: parts[5]
          };
          message.content = message.cpdlc.content;
          if (message.content) {
            message.content = message.content.replace(/@/g, "");
          }
        } else {
          const nonEmptyParts = parts.filter((part) => part !== "");
          message.content = nonEmptyParts.pop();
        }
      } else {
        message.content = message.payload;
      }
      messages.push(message);
    }
    return messages;
  };
  var sendAcarsMessage = async (state, receiver, payload, messageType) => {
    const params = new URLSearchParams([
      ["logon", state.code],
      ["from", state.callsign],
      ["type", messageType],
      ["to", receiver],
      ["packet", payload]
    ]);
    return fetch(
      `https://www.hoppie.nl/acars/system/connect.html?${params.toString()}`,
      {
        method: "GET"
      }
    );
  };
  var responseOptions = (c) => {
    const map = {
      WU: ["WILCO", "UNABLE"],
      AN: ["AFFIRMATIVE", "NEGATIVE"],
      R: ["ROGER", "UNABLE"],
      RA: ["ROGER", "UNABLE"],
      Y: ["YES", "NO"],
      N: ["YES", "NO"]
    };
    if (map[c]) return [...map[c], "STANDBY"];
    return null;
  };
  var forwardStateUpdate = (state) => {
    if (state._stationCallback)
      state._stationCallback({
        active: state.active_station,
        pending: state.pending_station
      });
  };
  var messageStateUpdate = (state, message) => {
    if (message.type === "cpdlc" && message.content === "LOGON ACCEPTED" && state.pending_station) {
      state.active_station = message.from;
      state.pending_station = null;
      forwardStateUpdate(state);
    } else if (message.type === "cpdlc" && message.content === "LOGOFF" && state.active_station) {
      state.active_station = null;
      state.pending_station = null;
      forwardStateUpdate(state);
    }
  };
  var cpdlcStringBuilder = (state, request, replyId = "") => {
    if (state._min_count === 63) {
      state._min_count = 0;
    }
    state._min_count++;
    return `/data2/${state._min_count}/${replyId}/N/${request}`;
  };
  var poll = (state) => {
    state._interval = setTimeout(() => {
      sendAcarsMessage(state, "SERVER", "Nothing", "POLL").then((response) => {
        if (response.ok) {
          response.text().then((raw) => {
            for (const message of parseMessages(raw)) {
              if (message.from === state.callsign && message.type === "inforeq") {
                continue;
              }
              if (state.active_station && message.from === state.active_station && message.content.startsWith("HANDOVER")) {
                state.active_station = null;
                const station = message.content.split(" ")[1];
                if (station) {
                  const corrected = station.trim().replace("@", "");
                  state.sendLogonRequest(corrected);
                  return;
                }
              }
              message._id = state.idc++;
              messageStateUpdate(state, message);
              if (message.type === "cpdlc" && message.cpdlc.ra) {
                const opts = responseOptions(message.cpdlc.ra);
                if (opts)
                  message.response = async (code) => {
                    message.respondSend = code;
                    if (state._min_count === 63) {
                      state._min_count = 0;
                    }
                    state._min_count++;
                    sendAcarsMessage(
                      state,
                      message.from,
                      `/data2/${state._min_count}/${message.cpdlc.min}/${code === "STANDBY" ? "NE" : "N"}/${code}`,
                      "cpdlc"
                    );
                  };
                message.options = opts;
                message.respondSend = null;
              }
              state.message_stack[message._id] = message;
              state._callback(message);
            }
            poll(state);
          });
        } else {
          poll(state);
        }
      });
    }, 1e4);
  };
  var addMessage = (state, content) => {
    state._callback({
      type: "send",
      content,
      from: state.callsign,
      ts: Date.now()
    });
    return content;
  };
  var convertUnixToHHMM = (unixTimestamp) => {
    const date = new Date(unixTimestamp);
    let hours = date.getUTCHours();
    let minutes = date.getUTCMinutes();
    hours = hours.toString().padStart(2, "0");
    minutes = minutes.toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  var createClient = (code, callsign, aicraftType, messageCallback) => {
    const state = {
      code,
      callsign,
      _callback: messageCallback,
      active_station: null,
      pending_station: null,
      _min_count: 0,
      aircraft: aicraftType,
      idc: 0,
      message_stack: {}
    };
    state.dispose = () => {
      if (state._interval) clearInterval(state._interval);
      state._interval = null;
    };
    state.sendTelex = async (to, message) => {
      const response = await sendAcarsMessage(
        state,
        to,
        addMessage(state, message.toUpperCase()),
        "telex"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.atisRequest = async (icao, type) => {
      const response = await sendAcarsMessage(
        state,
        state.callsign,
        `${(type === "ATIS" ? "VATATIS" : type).toUpperCase()} ${icao}`,
        "inforeq"
      );
      if (!response.ok) return false;
      const text = await response.text();
      for (const message of parseMessages(text)) {
        state._callback(message);
      }
      return text.startsWith("ok");
    };
    state.sendPositionReport = async (fl, mach, wp, wpEta, nextWp, nextWpEta, followWp) => {
      if (!state.active_station) return;
      const content = `OVER ${wp} AT ${wpEta}Z FL${fl}, ESTIMATING ${nextWp} AT ${nextWpEta}Z, THEREAFTER ${followWp}. CURRENT SPEED M${mach}`.toUpperCase();
      const response = await sendAcarsMessage(
        state,
        state.active_station,
        `/DATA1/*/*/*/*/FL${fl}/*/${mach}/

${content}`,
        "position"
      );
      addMessage(state, content);
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendLogonRequest = async (to) => {
      if (to === state.active_station) return;
      state.pending_station = to;
      const response = await sendAcarsMessage(
        state,
        to,
        cpdlcStringBuilder(state, addMessage(state, `REQUEST LOGON`)),
        "cpdlc"
      );
      if (!response.ok) return false;
      forwardStateUpdate(state);
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendLogoffRequest = async () => {
      if (!state.active_station) return;
      const station = state.active_station;
      state.active_station = null;
      const response = await sendAcarsMessage(
        state,
        station,
        cpdlcStringBuilder(state, addMessage(state, `LOGOFF`)),
        "cpdlc"
      );
      if (!response.ok) return false;
      const text = await response.text();
      forwardStateUpdate(state);
      return text.startsWith("ok");
    };
    state.sendOceanicClearance = async (cs, to, entryPoint, eta, level, mach, freeText) => {
      const response = await sendAcarsMessage(
        state,
        to,
        addMessage(
          state,
          `REQUEST OCEANIC CLEARANCE ${cs} ${state.aircraft} ESTIMATING ${entryPoint} AT ${eta}Z FLIGHT LEVEL ${lvl} REQUEST MACH ${mach}${freeText.length ? ` ${freeText}` : ""}`.toUpperCase()
        ),
        "telex"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendPdc = async (to, dep, arr, stand, atis, eob, freeText) => {
      const response = await sendAcarsMessage(
        state,
        to,
        addMessage(
          state,
          `REQUEST PREDEP CLEARANCE ${state.callsign} ${state.aircraft} TO ${arr} AT ${dep} ${stand} ATIS ${atis} ${eob}Z${freeText.length ? ` ${freeText}` : ""}`.toUpperCase()
        ),
        "telex"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendLevelChange = async (lvl2, climb, reason, freeText) => {
      const response = await sendAcarsMessage(
        state,
        state.active_station,
        cpdlcStringBuilder(
          state,
          addMessage(
            state,
            `REQUEST ${climb ? "CLIMB" : "DESCEND"} TO FL${lvl2} DUE TO ${{ weather: "weather", performance: "aircraft performance" }[reason.toLowerCase()]}${freeText.length ? ` ${freeText}` : ""}`.toUpperCase()
          )
        ),
        "cpdlc"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendSpeedChange = async (unit, value, reason, freeText) => {
      const response = await sendAcarsMessage(
        state,
        state.active_station,
        cpdlcStringBuilder(
          state,
          addMessage(
            state,
            `REQUEST ${unit === "knots" ? `${value} kts` : `M${value}`} DUE TO ${{ weather: "weather", performance: "aircraft performance" }[reason.toLowerCase()]}${freeText.length ? ` ${freeText}` : ""}`.toUpperCase()
          )
        ),
        "cpdlc"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    state.sendDirectTo = async (waypoint, reason, freeText) => {
      const response = await sendAcarsMessage(
        state,
        state.active_station,
        cpdlcStringBuilder(
          state,
          addMessage(
            state,
            `REQUEST DIRECT TO ${waypoint} DUE TO ${{ weather: "weather", performance: "aircraft performance" }[reason.toLowerCase()]}${freeText.length ? ` ${freeText}` : ""}`.toUpperCase()
          )
        ),
        "cpdlc"
      );
      if (!response.ok) return false;
      const text = await response.text();
      return text.startsWith("ok");
    };
    poll(state);
    return state;
  };

  // src/AcarsService.mjs
  var import_msfs_wt21_shared2 = __toESM(__require("@microsoft/msfs-wt21-shared"), 1);
  var acars = {
    client: null,
    messages: []
  };
  var fetchAcarsMessages = (bus, type) => {
    return new Promise((resolve) => {
      const sub = bus.getSubscriber().on(`acars_messages_${type}_response`).handle((v) => {
        sub.destroy();
        resolve(v.messages);
      });
      bus.getPublisher().pub(`acars_messages_${type}`, null, true, false);
    });
  };
  var fetchAcarsStatus = (bus) => {
    return new Promise((resolve) => {
      const sub = bus.getSubscriber().on(`acars_status_response`).handle((v) => {
        sub.destroy();
        resolve(v);
      });
      bus.getPublisher().pub(`acars_status_req`, null, true, false);
    });
  };
  var acarsService = (bus) => {
    const publisher = bus.getPublisher();
    bus.getSubscriber().on("acars_message_send").handle((v) => {
      if (acars.client)
        acars.client[v.key].apply(
          void 0,
          Array.isArray(v.arguments) ? v.arguments : Object.value(v.arguments)
        );
      return true;
    });
    bus.getSubscriber().on("acars_message_ack").handle((v) => {
      if (acars.client) {
        const message = acars.messages.find((e) => e._id === v.id);
        if (message) {
          message.response(v.option);
          publisher.pub(
            "acars_message_state_update",
            {
              id: v.id,
              option: v.option
            },
            true,
            false
          );
        }
      }
      return true;
    });
    bus.getSubscriber().on("acars_messages_send").handle((v) => {
      publisher.pub(
        "acars_messages_send_response",
        { messages: acars.messages.filter((e) => e.type === "send") },
        true,
        false
      );
      return true;
    });
    bus.getSubscriber().on("acars_status_req").handle((v) => {
      publisher.pub(
        "acars_status_response",
        {
          active: acars.client ? acars.client.active_station : null,
          pending: acars.client ? acars.client.pending_station : null
        },
        true,
        false
      );
      return true;
    });
    bus.getSubscriber().on("acars_messages_recv").handle((v) => {
      publisher.pub(
        "acars_messages_recv_response",
        { messages: acars.messages.filter((e) => e.type !== "send") },
        true,
        false
      );
      return true;
    });
    import_msfs_wt21_shared2.default.FmcUserSettings.getManager(bus).getSetting("flightNumber").sub((value) => {
      if (!value || !value.length) {
        const current = (void 0).acarsClient.get();
        if (current) {
          current.dispose();
        }
        acars.client = null;
        publisher.pub("acars_new_client", null, true, false);
        return;
      }
      acars.client = createClient(
        GetStoredData("cj4_plus_hoppie_code"),
        value,
        "C25C",
        (message) => {
          acars.messages.push(message);
          if (message.type === "send") {
            publisher.getPublisher().pub("acars_outgoing_message", message, true, false);
          } else {
            publisher.pub("acars_incoming_message", message, true, false);
            SimVar.SetSimVarValue("L:WT_CMU_DATALINK_RCVD", "number", 1);
          }
        }
      );
      acars.client._stationCallback = (opt) => {
        publisher.getPublisher().pub("acars_station_status", opt, true, false);
      };
    });
  };
  var AcarsService_default = acarsService;

  // src/DatalinkPages.mjs
  var DatalinkSendMessagesPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.messages = import_msfs_sdk4.Subject.create([[]]);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.bus.getSubscriber().on("acars_outgoing_message").handle((message) => {
        const current = this.messages.get();
        const entry = {
          message,
          link: import_msfs_sdk4.PageLinkField.createLink(
            this,
            `<${message.content.substr(0, 23)}`,
            "/datalink-extra/message",
            false,
            {
              message
            }
          )
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
            link: import_msfs_sdk4.PageLinkField.createLink(
              this,
              `<${message.content.substr(0, 23)}`,
              "/datalink-extra/message",
              false,
              {
                message
              }
            )
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
        const array = Array(10).fill().map((e) => []);
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ];
      });
    }
  };
  var DatalinkReceivedMessagesPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.messages = import_msfs_sdk4.Subject.create([[]]);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.bus.getSubscriber().on("acars_incoming_message").handle((message) => {
        const current = this.messages.get();
        const entry = {
          message,
          link: import_msfs_sdk4.PageLinkField.createLink(
            this,
            `<${message.from} ${message.content.substr(0, 22 - message.from.length)}`,
            "/datalink-extra/message",
            false,
            {
              message
            }
          )
        };
        if (current[0].length < 5) {
          current[0].unshift(entry);
        } else {
          current.unshift([entry]);
        }
        this.messages.set(current);
        this.invalidate();
      });
      this.bus.getSubscriber().on("acars_message_state_update").handle((e) => {
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
            link: import_msfs_sdk4.PageLinkField.createLink(
              this,
              `<${message.content.substr(0, 23)}`,
              "/datalink-extra/message",
              false,
              {
                message
              }
            )
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
        const array = Array(10).fill().map((e) => []);
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ];
      });
    }
  };
  var DatalinkMessagePage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.options = [];
      this.updateHandler = bus.getSubscriber().on("acars_message_state_update").handle((e) => {
        const message = this.params.get("message");
        if (message && e.id === message._id) {
          message.respondSend = e.option;
          this.options = [
            ...message.options.map((e2) => message.respondSend === e2 ? e2 : "")
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
                new import_msfs_sdk4.DisplayField(this, {
                  formatter: {
                    format(value) {
                      return i === 0 ? `<${opt}[blue s-text]` : `${opt}>[blue s-text]`;
                    }
                  },
                  onSelected: async () => {
                    if (message.respondSend) return true;
                    this.bus.getPublisher().pub(
                      "acars_message_ack",
                      {
                        option: opt,
                        id: message._id
                      },
                      true,
                      false
                    );
                    return true;
                  }
                }).bind(import_msfs_sdk4.Subject.create(opt))
              );
            }
          } else {
            this.options = [
              ...message.options.map((e) => message.respondSend === e ? e : "")
            ];
          }
        }
      }
      const pages = message.content.replace(/\n/g, " ").split(" ").map((e) => `${e} `).reduce(
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
                if (last.length < (acc.length === 1 ? messageLines - 1 : messageLines)) {
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
        [[]]
      ).map((page, i) => {
        if (i === 0) page.unshift([message.from]);
        while (page.length < messageLines) page.push([]);
        if (message.options) {
          page.push([this.options[0], this.options[1]]);
        }
        return [
          [
            "DL[blue]",
            this.PagingIndicator,
            `${message.type === "send" ? "SEND" : "RECV"} MSG[blue]`
          ],
          [`${convertUnixToHHMM(message.ts)}[blue]`],
          ...page,
          [],
          [
            import_msfs_sdk4.PageLinkField.createLink(
              this,
              "<RETURN",
              `/datalink-extra/${message.type === "send" ? "send-msgs" : "recv-msgs"}`
            ),
            message.options ? this.options[2] : "",
            this.clockField
          ]
        ];
      });
      return pages;
    }
  };
  var DatalinkAtisPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.send = import_msfs_sdk4.Subject.create(false);
      this.reqType = import_msfs_sdk4.Subject.create(0);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.facility = import_msfs_sdk4.Subject.create("");
      this.opts = ["ATIS", "METAR", "TAF"];
      this.typeSwitch = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.opts,
        activeStyle: "green"
      }).bind(this.reqType);
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "atisRequest",
                arguments: [this.facility.get(), this.opts[this.reqType.get()]]
              },
              true,
              false
            );
            [this.facility].forEach((e) => e.set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1",
          maxLength: 4
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          this.checkReady();
          return true;
        }
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkPreDepartureRequestPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.flightId = import_msfs_sdk4.Subject.create("");
      this.facility = import_msfs_sdk4.Subject.create("");
      this.acType = import_msfs_sdk4.Subject.create("C25C");
      this.atis = import_msfs_sdk4.Subject.create("");
      this.dep = import_msfs_sdk4.Subject.create("");
      this.arr = import_msfs_sdk4.Subject.create("");
      this.gate = import_msfs_sdk4.Subject.create("");
      this.send = import_msfs_sdk4.Subject.create(false);
      for (let i = 0; i < 4; i++) {
        this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
        this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this[`freeText${i}`]);
      }
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(4).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
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
                  freeText
                ]
              },
              true,
              false
            );
            [this.atis, this.facility, this.gate].forEach((e) => e.set(""));
            Array(4).fill().forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      this.flightIdField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 7
        }),
        onSelected: async (scratchpadContents) => {
          this.flightId.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.flightId);
      this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 7
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.facility);
      this.acTypeField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1",
          maxLength: 4
        }),
        onSelected: async (scratchpadContents) => {
          this.acType.set(scratchpadContents);
          return true;
        }
      }).bind(this.acType);
      this.atisField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({ nullValueString: "\u25A1", maxLength: 1 }),
        onSelected: async (scratchpadContents) => {
          this.atis.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.atis);
      this.depField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1",
          maxLength: 4
        }),
        onSelected: async (scratchpadContents) => {
          this.dep.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.dep);
      this.arrField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1",
          maxLength: 4
        }),
        onSelected: async (scratchpadContents) => {
          this.arr.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.arr);
      this.gateField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 7
        }),
        onSelected: async (scratchpadContents) => {
          this.gate.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.gate);
      this.bus.getSubscriber().on("fplOriginDestChanged").handle((evt) => {
        switch (evt.type) {
          case import_msfs_sdk4.default.OriginDestChangeType.OriginAdded: {
            if (evt.airport) {
              this.fms.facLoader.getFacility(
                import_msfs_sdk4.default.ICAO.getFacilityType(evt.airport),
                evt.airport
              ).then((airport) => {
                this.dep.set(airport.icaoStruct.ident);
              });
            }
            break;
          }
          case import_msfs_sdk4.default.OriginDestChangeType.DestinationAdded: {
            if (evt.airport) {
              this.fms.facLoader.getFacility(
                import_msfs_sdk4.default.ICAO.getFacilityType(evt.airport),
                evt.airport
              ).then((airport) => {
                this.arr.set(airport.icaoStruct.ident);
                this.flightId.set(
                  import_msfs_wt21_shared3.default.FmcUserSettings.getManager(this.bus).getSetting("flightNumber").get()
                );
              });
            }
            break;
          }
        }
      });
      this.flightId.set(
        import_msfs_wt21_shared3.default.FmcUserSettings.getManager(this.bus).getSetting("flightNumber").get()
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
        })
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkOceanicRequestPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.flightId = import_msfs_sdk4.Subject.create("");
      this.facility = import_msfs_sdk4.Subject.create("");
      this.entryPoint = import_msfs_sdk4.Subject.create("");
      this.time = import_msfs_sdk4.Subject.create("");
      this.mach = import_msfs_sdk4.Subject.create("");
      this.fltLvl = import_msfs_sdk4.Subject.create("");
      this.send = import_msfs_sdk4.Subject.create(false);
      for (let i = 0; i < 4; i++) {
        this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
        this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this[`freeText${i}`]);
      }
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(4).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
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
                  freeText
                ]
              },
              true,
              false
            );
            [
              this.facility,
              this.entryPoint,
              this.time,
              this.fltLvl,
              this.mach
            ].forEach((e) => e.set(""));
            Array(4).fill().forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      this.flightIdField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 7
        }),
        onSelected: async (scratchpadContents) => {
          this.flightId.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.flightId);
      this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 11
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.facility);
      this.entryPointField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 11
        }),
        onSelected: async (scratchpadContents) => {
          this.entryPoint.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.entryPoint);
      this.timeField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1:\u25A1\u25A1",
          maxLength: 11
        }),
        onSelected: async (scratchpadContents) => {
          if (!scratchpadContents.length === 4 || Number.isNaN(Number.parseInt(scratchpadContents))) {
            return false;
          }
          this.time.set(
            `${scratchpadContents.substr(0, 2)}:${scratchpadContents.substr(2)}`
          );
          this.checkReady();
          return true;
        }
      }).bind(this.time);
      this.machField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: ".\u25A1\u25A1",
          maxLength: 3
        }),
        onSelected: async (scratchpadContents) => {
          if (!scratchpadContents.length > 3 || Number.isNaN(Number.parseFloat("0" + scratchpadContents))) {
            return false;
          }
          this.mach.set(`.${scratchpadContents.replace(".", "")}`);
          this.checkReady();
          return true;
        }
      }).bind(this.mach);
      this.fltLvlField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1",
          maxLength: 3
        }),
        onSelected: async (scratchpadContents) => {
          if (!scratchpadContents.length > 3 || Number.isNaN(Number.parseInt(scratchpadContents))) {
            return false;
          }
          this.fltLvl.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.fltLvl);
      this.bus.getSubscriber().on("fplOriginDestChanged").handle((evt) => {
        this.flightId.set(
          import_msfs_wt21_shared3.default.FmcUserSettings.getManager(this.bus).getSetting("flightNumber").get()
        );
      });
      this.flightId.set(
        import_msfs_wt21_shared3.default.FmcUserSettings.getManager(this.bus).getSetting("flightNumber").get()
      );
    }
    checkReady() {
      const array = [
        this.facility,
        this.flightId,
        this.entryPoint,
        this.time,
        this.mach,
        this.fltLvl
      ];
      this.send.set(
        !array.find((e) => {
          const v = e.get();
          return !v || !v.length;
        })
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
          [this.machField, this.flightIdField],
          [""],
          [],
          [""],
          ["", this.sendButton],
          [""],
          [
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkTelexPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      try {
        super(bus, screen, props, fms, baseInstrument, renderCallback);
        this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
        this.facility = import_msfs_sdk4.Subject.create("");
        this.send = import_msfs_sdk4.Subject.create(false);
        for (let i = 0; i < 7; i++) {
          this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
          this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
            formatter: new import_msfs_wt21_fmc4.StringInputFormat({
              nullValueString: "(----------------------)[blue]",
              maxLength: 24
            }),
            onSelected: async (scratchpadContents) => {
              this[`freeText${i}`].set(scratchpadContents);
              this.checkReady();
              return true;
            }
          }).bind(this[`freeText${i}`]);
        }
        this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
          formatter: {
            nullValueString: "SEND",
            /** @inheritDoc */
            format(value) {
              return `SEND[${value ? "blue" : "white"}]`;
            }
          },
          onSelected: async () => {
            if (this.send.get()) {
              const freeText = Array(7).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
              this.bus.getPublisher().pub(
                "acars_message_send",
                {
                  key: "sendTelex",
                  arguments: [this.facility.get(), freeText]
                },
                true,
                false
              );
              [this.facility].forEach((e) => e.set(""));
              Array(7).fill().forEach((_, i) => this[`freeText${i}`].set(""));
              this.checkReady();
            }
            return true;
          }
        }).bind(this.send);
        this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
            maxLength: 7
          }),
          onSelected: async (scratchpadContents) => {
            this.facility.set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this.facility);
      } catch (err) {
        console.log("error");
      }
    }
    checkReady() {
      const array = [this.facility];
      const freeText = Array(7).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
      this.send.set(
        freeText.length && !array.find((e) => {
          const v = e.get();
          return !v || !v.length;
        })
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkStatusPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.facility = import_msfs_sdk4.Subject.create("");
      this.send = import_msfs_sdk4.Subject.create("NOTIFY");
      this.status = import_msfs_sdk4.Subject.create(null);
      this.activeStation = import_msfs_sdk4.Subject.create("");
      this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 11
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          return true;
        }
      }).bind(this.facility);
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "",
          /** @inheritDoc */
          format(value) {
            return `<${value}[blue]`;
          }
        },
        onSelected: async () => {
          if (this.activeStation.get()) {
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendLogoffRequest",
                arguments: []
              },
              true,
              false
            );
          } else {
            if (this.facility.get().length)
              this.bus.getPublisher().pub(
                "acars_message_send",
                {
                  key: "sendLogonRequest",
                  arguments: [this.facility.get()]
                },
                true,
                false
              );
          }
          return true;
        }
      }).bind(this.send);
      this.statusField = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "----",
          /** @inheritDoc */
          format(value) {
            return value;
          }
        }
      }).bind(this.status);
      this.bus.getSubscriber().on("acars_station_status").handle((message) => {
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkDirectToPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.facility = import_msfs_sdk4.Subject.create("");
      this.send = import_msfs_sdk4.Subject.create(false);
      this.reason = import_msfs_sdk4.Subject.create(0);
      this.opts = ["WEATHER", "A/C PERF"];
      this.station = import_msfs_sdk4.Subject.create(null);
      this.bus.getSubscriber().on("acars_station_status").handle((message) => {
        this.station.set(message.active);
        this.checkReady();
        this.invalidate();
      });
      this.stationField = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "----",
          /** @inheritDoc */
          format(value) {
            return `${value}[blue]`;
          }
        }
      }).bind(this.station);
      for (let i = 0; i < 4; i++) {
        this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
        this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this[`freeText${i}`]);
      }
      fetchAcarsStatus(this.bus).then((res) => {
        this.station.set(res.active);
        this.invalidate();
      });
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(4).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendDirectTo",
                arguments: [
                  this.facility.get(),
                  this.reason.get() === 0 ? "weather" : "performance",
                  freeText
                ]
              },
              true,
              false
            );
            [this.facility].forEach((e) => e.set(""));
            Array(4).fill().forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      this.facilityField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1\u25A1",
          maxLength: 5
        }),
        onSelected: async (scratchpadContents) => {
          this.facility.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.facility);
      this.reasonField = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.opts,
        activeStyle: "green"
      }).bind(this.reason);
    }
    checkReady() {
      const array = [this.facility, this.station];
      this.send.set(
        !array.find((e) => {
          const v = e.get();
          return !v || !v.length;
        })
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkSpeedPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.send = import_msfs_sdk4.Subject.create(false);
      this.value = import_msfs_sdk4.Subject.create("");
      this.reason = import_msfs_sdk4.Subject.create(0);
      this.unit = import_msfs_sdk4.Subject.create(0);
      this.opts = ["WEATHER", "A/C PERF"];
      this.units = ["KTS", "MACH"];
      this.station = import_msfs_sdk4.Subject.create(null);
      this.bus.getSubscriber().on("acars_station_status").handle((message) => {
        this.station.set(message.active);
        this.checkReady();
        this.invalidate();
      });
      this.stationField = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "----",
          /** @inheritDoc */
          format(value) {
            return `${value}[blue]`;
          }
        }
      }).bind(this.station);
      for (let i = 0; i < 4; i++) {
        this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
        this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this[`freeText${i}`]);
      }
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(4).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendSpeedChange",
                arguments: [
                  this.unit.get() === 0 ? "knots" : "mach",
                  this.value.get(),
                  this.reason.get() === 0 ? "weather" : "performance",
                  freeText
                ]
              },
              true,
              false
            );
            [this.value].forEach((e) => e.set(""));
            Array(4).fill().forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      fetchAcarsStatus(this.bus).then((res) => {
        this.station.set(res.active);
        this.invalidate();
      });
      this.speedField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1\u25A1",
          maxLength: 4,
          format(value) {
            return `${this.unit.get() === 1 ? "M" : ""}${value}`;
          }
        }),
        onSelected: async (scratchpadContents) => {
          if (Number.isNaN(Number.parseFloat(scratchpadContents))) return false;
          this.value.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.value);
      this.reasonField = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.opts,
        activeStyle: "green"
      }).bind(this.reason);
      this.unitField = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.units,
        activeStyle: "green"
      }).bind(this.unit);
    }
    checkReady() {
      const array = [this.value, this.station];
      this.send.set(
        !array.find((e) => {
          const v = e.get();
          return typeof v === "string" ? v.length === 0 : false;
        })
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };
  var DatalinkLevelPage = class extends import_msfs_wt21_fmc4.WT21FmcPage {
    constructor(bus, screen, props, fms, baseInstrument, renderCallback) {
      super(bus, screen, props, fms, baseInstrument, renderCallback);
      this.clockField = import_msfs_wt21_fmc4.FmcCmuCommons.createClockField(this, this.bus);
      this.send = import_msfs_sdk4.Subject.create(false);
      this.value = import_msfs_sdk4.Subject.create("");
      this.reason = import_msfs_sdk4.Subject.create(0);
      this.unit = import_msfs_sdk4.Subject.create(0);
      this.opts = ["WEATHER", "A/C PERF"];
      this.units = ["CLIMB", "DESCEND"];
      this.station = import_msfs_sdk4.Subject.create(null);
      this.bus.getSubscriber().on("acars_station_status").handle((message) => {
        this.station.set(message.active);
        this.checkReady();
        this.invalidate();
      });
      this.stationField = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "----",
          /** @inheritDoc */
          format(value) {
            return `${value}[blue]`;
          }
        }
      }).bind(this.station);
      fetchAcarsStatus(this.bus).then((res) => {
        this.station.set(res.active);
        this.invalidate();
      });
      for (let i = 0; i < 4; i++) {
        this[`freeText${i}`] = import_msfs_sdk4.Subject.create("");
        this[`freeTextField${i}`] = new import_msfs_sdk4.default.TextInputField(this, {
          formatter: new import_msfs_wt21_fmc4.StringInputFormat({
            nullValueString: "(----------------------)[blue]",
            maxLength: 24
          }),
          onSelected: async (scratchpadContents) => {
            this[`freeText${i}`].set(scratchpadContents);
            this.checkReady();
            return true;
          }
        }).bind(this[`freeText${i}`]);
      }
      this.sendButton = new import_msfs_sdk4.default.DisplayField(this, {
        formatter: {
          nullValueString: "SEND",
          /** @inheritDoc */
          format(value) {
            return `SEND[${value ? "blue" : "white"}]`;
          }
        },
        onSelected: async () => {
          if (this.send.get()) {
            const freeText = Array(4).fill().map((_, i) => this[`freeText${i}`].get()).filter((e) => e && e.length).join(" ");
            this.bus.getPublisher().pub(
              "acars_message_send",
              {
                key: "sendLevelChange",
                arguments: [
                  this.value.get(),
                  this.unit.get() === 0,
                  this.reason.get() === 0 ? "weather" : "performance",
                  freeText
                ]
              },
              true,
              false
            );
            [this.value].forEach((e) => e.set(""));
            Array(4).fill().forEach((_, i) => this[`freeText${i}`].set(""));
            this.checkReady();
          }
          return true;
        }
      }).bind(this.send);
      this.levelField = new import_msfs_sdk4.default.TextInputField(this, {
        formatter: new import_msfs_wt21_fmc4.StringInputFormat({
          nullValueString: "\u25A1\u25A1\u25A1",
          maxLength: 3,
          format(value) {
            return `FL${value}`;
          }
        }),
        onSelected: async (scratchpadContents) => {
          if (scratchpadContents.startsWith("FL"))
            scratchpadContents = scratchpadContents.substr(2);
          if (Number.isNaN(Number.parseInt(scratchpadContents))) return false;
          this.value.set(scratchpadContents);
          this.checkReady();
          return true;
        }
      }).bind(this.value);
      this.reasonField = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.opts,
        activeStyle: "green"
      }).bind(this.reason);
      this.unitField = new import_msfs_sdk4.default.SwitchLabel(this, {
        optionStrings: this.units,
        activeStyle: "green"
      }).bind(this.unit);
    }
    checkReady() {
      const array = [this.value, this.station];
      this.send.set(
        !array.find((e) => {
          const v = e.get();
          return v === null || typeof v === "string" ? v.length === 0 : false;
        })
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
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
            import_msfs_sdk4.PageLinkField.createLink(this, "<RETURN", "/datalink-menu"),
            "",
            this.clockField
          ]
        ]
      ];
    }
  };

  // src/PerfPageExtension.mjs
  var import_msfs_wt21_fmc5 = __require("@microsoft/msfs-wt21-fmc");
  var import_msfs_sdk5 = __toESM(__require("@microsoft/msfs-sdk"), 1);
  var import_msfs_wt21_shared4 = __toESM(__require("@microsoft/msfs-wt21-shared"), 1);
  var PerfInitPageExtension = class extends import_msfs_sdk5.AbstractFmcPageExtension {
    constructor(page) {
      super(page);
      this.simbriefId = import_msfs_sdk5.Subject.create(GetStoredData("cj4_plus_simbrief_id"));
      this.fetchSimbrief = new import_msfs_sdk5.default.DisplayField(page, {
        formatter: new import_msfs_wt21_fmc5.SimpleStringFormat("<LOAD UPLNK"),
        onSelected: async () => {
          return this.loadAndInsertPerf(page, this.simbriefId.get());
        }
      });
      page.bus.getSubscriber().on("simbrief_id").handle((v) => {
        this.simbriefId.set(v);
      });
    }
    async loadAndInsertPerf(page, id) {
      try {
        const response = await fetch(
          `https://www.simbrief.com/api/xml.fetcher.php?json=1&userid=${id}`
        );
        const json = await response.json();
        const fms = page.fms;
        const { weights } = json;
        const pax = Number.parseInt(weights.pax_count_actual);
        const paxWeight = Number.parseFloat(weights.pax_weight);
        const unit = json.params.units;
        const simUnitVar = unit === "kgs" ? "kilograms" : "pounds";
        if (pax > 0) {
          SimVar.SetSimVarValue(
            "PAYLOAD STATION WEIGHT:1",
            simUnitVar,
            paxWeight
          );
        }
        if (pax > 1) {
          SimVar.SetSimVarValue(
            "PAYLOAD STATION WEIGHT:2",
            simUnitVar,
            paxWeight
          );
        }
        if (pax > 2) {
          SimVar.SetSimVarValue(
            "PAYLOAD STATION WEIGHT:3",
            simUnitVar,
            paxWeight * (pax > 3 ? 2 : 1)
          );
        }
        if (pax > 4) {
          SimVar.SetSimVarValue(
            "PAYLOAD STATION WEIGHT:4",
            simUnitVar,
            paxWeight * (pax - 4)
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
          fuel / ratio
        );
        SimVar.SetSimVarValue(
          "FUEL TANK RIGHT MAIN QUANTITY",
          "gallons",
          fuel / ratio
        );
        fms.performancePlanProxy.cruiseAltitude.set(
          Number.parseInt(json.general.initial_altitude)
        );
        fms.performancePlanProxy.cargoWeight.set(cargo * 2.2);
        fms.performancePlanProxy.paxNumber.set(pax);
        fms.performancePlanProxy.averagePassengerWeight.set(paxWeight * 2.2);
        return "";
      } catch (err) {
        throw "UPKLNK LOAD FAILED";
      }
    }
    onPageRendered(renderedTemplates) {
      const elem = this.simbriefId.get();
      if (elem) renderedTemplates[0][12][0] = this.fetchSimbrief;
    }
  };
  var PerfPageExtension_default = PerfInitPageExtension;

  // src/app.mjs
  var Plugin = class extends import_msfs_wt21_fmc6.WT21FmcAvionicsPlugin {
    constructor(binder) {
      super(binder);
      this.binder = binder;
      this.acarsClient = import_msfs_sdk6.Subject.create(null);
    }
    onInit() {
    }
    onInstalled() {
    }
    registerFmcExtensions(context) {
      const name = SimVar.GetSimVarValue("TITLE", "string");
      if (name !== "Cessna Citation CJ4" && name !== "Cessna CJ4 Citation Asobo") return;
      SimVar.SetSimVarValue("L:CJ4_PLUS_ACTIVE", "number", 1);
      this.renderer = context.renderer;
      this.cduRenderer = new CduRenderer_default(this.renderer, this.binder);
      context.addPluginPageRoute(
        "/datalink-extra/predep",
        DatalinkPreDepartureRequestPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/oceanic",
        DatalinkOceanicRequestPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/send-msgs",
        DatalinkSendMessagesPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/recv-msgs",
        DatalinkReceivedMessagesPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/telex",
        DatalinkTelexPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/atis",
        DatalinkAtisPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/message",
        DatalinkMessagePage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/cpdlc/status",
        DatalinkStatusPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/cpdlc/direct",
        DatalinkDirectToPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/cpdlc/speed",
        DatalinkSpeedPage,
        void 0,
        {}
      );
      context.addPluginPageRoute(
        "/datalink-extra/cpdlc/level",
        DatalinkLevelPage,
        void 0,
        {}
      );
      context.attachPageExtension(import_msfs_wt21_fmc6.UserSettingsPage, SettingsExtension_default);
      context.attachPageExtension(import_msfs_wt21_fmc6.RouteMenuPage, RouteMenuExtension_default);
      context.attachPageExtension(import_msfs_wt21_fmc6.DataLinkMenuPage, DatalinkPageExtension_default);
      context.attachPageExtension(import_msfs_wt21_fmc6.PerfInitPage, PerfPageExtension_default);
      if (this.binder.isPrimaryInstrument) {
        this.client = AcarsService_default(this.binder.bus);
      }
    }
  };
  import_msfs_sdk6.default.registerPlugin(Plugin);
})();

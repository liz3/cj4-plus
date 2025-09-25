// https://github.com/tracernz/wt21-mobiflight/blob/trunk/src/html_ui/Plugins/tracernz/wt21/wt21_cdu_mobiflight.ts
const MF_CAPT_URL = "ws://localhost:8320/winwing/cdu-captain";
const MF_FO_URL = "ws://localhost:8320/winwing/cdu-co-pilot";
const MF_CDU_ROWS = 14;
const MF_CDU_COLS = 24;

const MfCharSize = Object.freeze({
  Large: 0,
  Small: 1,
});

const MfColour = Object.freeze({
  Amber: "a",
  Brown: "o",
  Cyan: "c",
  Green: "g",
  Grey: "e",
  Khaki: "k",
  Magenta: "m",
  Red: "r",
  White: "w",
  Yellow: "y",
});

class CduRenderer {
  constructor(renderer, binder) {
    this.renderer = renderer;
    this.binder = binder;
    this.active = GetStoredData("cj4_plus_winwing_setting") === "true";

    this.rowData = Array.from({ length: MF_CDU_ROWS * MF_CDU_COLS }, () => []);
    this.socketUri = !!this.binder.isPrimaryInstrument
      ? MF_CAPT_URL
      : MF_FO_URL;
    this.binder.bus
      .getSubscriber()
      .on("simTime")
      .atFrequency(4)
      .handle(() => this.update());
    this.binder.bus
      .getSubscriber()
      .on("cj4_plus_winwing_setting")
      .handle((v) => {
        this.active = v;
        if (!this.active) {
          if (this.socket) {
            try {
              this.socket.close();
            } catch (err) {}
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
      "\xa0": " ",
      "□": "\u2610",
      "⬦": "°",
    };

    this.charRegex = new RegExp(`[${Object.keys(this.charMap).join("")}]`);
    this.colourMap = new Map([
      ["blue", MfColour.Cyan],
      ["green", MfColour.Green],
      ["disabled", MfColour.Grey],
      ["magenta", MfColour.Magenta],
      ["yellow", MfColour.Yellow],
      ["white", MfColour.White],
    ]);
    if(this.active)
    this.connect();
  }
  connect() {
    this.socket = new WebSocket(this.socketUri);
    this.socket.onerror = () => {
      try {
        this.socket.close();
      } catch (err) {}
      if (this.active)
        setTimeout(() => {
          this.connect();
        }, 5000);
    };
    this.socket.onopen = () => {
      this.needsUpdate = true;
    };
  }
  update() {
    if (!this.needsUpdate) return;
    this.needsUpdate = false;

    for (
      let r = 0;
      r < this.renderer.options.screenCellHeight && r < MF_CDU_ROWS;
      r++
    ) {
      for (
        let c = 0;
        c < this.renderer.options.screenCellWidth && c < MF_CDU_COLS;
        c++
      ) {
        this.copyWtColDataToOutput(r, c);
      }
    }
    if (this.isScratchpadBlank()) {
      const bottomMessage = this.getBottomMessage();
      let outputIndex = this.getFirstScratchpadIndex();
      for (let i = 0; i < bottomMessage.length; i++, outputIndex++) {
        // we assume there were no special styles on the scratchpad ¯_(ツ)_/¯
        this.rowData[outputIndex][0] = bottomMessage[i];
      }
    }

    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(
        JSON.stringify({ Target: "Display", Data: this.rowData }),
      );
    }
  }
  copyWtColDataToOutput(rowIndex, colIndex) {
    const outputIndex = rowIndex * MF_CDU_COLS + colIndex;
    // More privates
    const cellData = this.renderer.columnData[rowIndex][colIndex];
    this.rowData[outputIndex][0] = cellData.content.replace(
      this.charRegex,
      (c) => this.charMap[c],
    );
    this.rowData[outputIndex][1] = this.getColour(cellData);
    this.rowData[outputIndex][2] =
      (rowIndex % 2 === 1 && rowIndex !== MF_CDU_ROWS - 1) ||
      cellData.styles.includes("s-text")
        ? MfCharSize.Small
        : MfCharSize.Large;
  }
  getBottomMessage() {
    if (!this.renderer) {
      return "";
    }
    const row = this.renderer.options.screenCellHeight - 1;
    return this.renderer.columnData[row]
      .reduce((msg, cell) => (msg += cell.content), "")
      .replace(/EXEC$/, "")
      .trim();
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
}
export default CduRenderer;

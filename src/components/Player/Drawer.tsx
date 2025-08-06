import * as d3 from "d3";
import type { IOptions } from "./interface";

class Drawer {
  private buffer: AudioBuffer;
  private parent: HTMLElement;
  private svgNode?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private xScale?: d3.ScaleLinear<number, number>;
  private onSeek?: (time: number) => void;
  private onSeekPreview?: (time: number) => void;
  private onSeekStart?: () => void;

  constructor(buffer: AudioBuffer, parent: HTMLElement) {
    this.buffer = buffer;
    this.parent = parent;
  }

  public setSeekCallback(callback: (time: number) => void) {
    this.onSeek = callback;
  }

  public setSeekPreviewCallback(callback: (time: number) => void) {
    this.onSeekPreview = callback;
  }

  public setSeekStartCallback(callback: () => void) {
    this.onSeekStart = callback;
  }

  public generateWaveform(audioData: number[], options: IOptions) {
    const {
      margin = { top: 0, bottom: 20, left: 0, right: 0 },
      height = this.parent.clientHeight,
      width = this.parent.clientWidth,
      padding = 1,
    } = options;

    this.xScale = d3
      .scaleLinear()
      .domain([0, audioData.length - 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(audioData))
      .range([margin.top, height - margin.bottom]);

    const svg = d3
      .create("svg")
      .style("width", width)
      .style("height", height)
      .style("display", "block")
      .style("background", "#1f2937")
      .style("filter", "drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))");

    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "waveGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#60a5fa");
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#9333ea");

    const g = svg.append("g").attr("transform", `translate(0, ${height / 2})`);
    const band = (width - margin.left - margin.right) / audioData.length;

    g.selectAll("rect")
      .data(audioData)
      .join("rect")
      .attr("fill", "url(#waveGradient)")
      .attr("height", (d) => yScale(d))
      .attr("width", () => band * padding)
      .attr("x", (_, i) => this.xScale!(i))
      .attr("y", (d) => -yScale(d) / 2)
      .attr("rx", band / 1.5)
      .attr("ry", band / 1.5);

    const cursorGroup = svg.append("g").attr("id", "cursorGroup");

    cursorGroup
      .append("line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#facc15")
      .attr("stroke-width", 3)
      .attr("filter", "drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))");

    cursorGroup
      .append("polygon")
      .attr("points", "-6,0 6,0 0,12")
      .attr("fill", "#facc15")
      .attr("filter", "drop-shadow(0 0 3px rgba(250, 204, 21, 0.8))");

    cursorGroup.call(
      d3
        .drag<SVGGElement, unknown>()
        .on("start", () => {
          if (this.onSeekStart) this.onSeekStart();
        })
        .on("drag", (event) => {
          const x = Math.max(0, Math.min(width, event.x));
          cursorGroup.attr("transform", `translate(${x},0)`);

          const progress = x / width;
          const newTime = progress * this.buffer.duration;

          if (this.onSeekPreview) {
            this.onSeekPreview(newTime);
          }
        })
        .on("end", (event) => {
          const x = Math.max(0, Math.min(width, event.x));
          const progress = x / width;
          const newTime = progress * this.buffer.duration;

          if (this.onSeek) {
            this.onSeek(newTime);
          }
        })
    );

    this.svgNode = svg;
    return svg;
  }

  public clearData() {
    const rawData = this.buffer.getChannelData(0);
    const samples = this.buffer.sampleRate;
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];
    for (let i = 0; i < samples; i += 1) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j += 1) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }
    const multiplier = Math.max(...filteredData) ** -1;
    return filteredData.map((n) => n * multiplier);
  }

  public init() {
    const audioData = this.clearData();
    const svg = this.generateWaveform(audioData, {});
    this.parent.appendChild(svg.node() as Element);
  }

  public updateCursor(currentTime: number, duration: number) {
    if (!this.svgNode || !this.xScale) return;
    const totalWidth = this.parent.clientWidth;
    const progress = currentTime / duration;
    const xPos = progress * totalWidth;
    this.svgNode
      .select("#cursorGroup")
      .attr("transform", `translate(${xPos},0)`);
  }
}

export default Drawer;

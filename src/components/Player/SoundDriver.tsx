import Drawer from "./Drawer";

class SoundDriver {
  private readonly audiFile;

  private drawer?: Drawer;

  private context: AudioContext;

  private gainNode?: GainNode = undefined;

  private audioBuffer?: AudioBuffer = undefined;

  private bufferSource?: AudioBufferSourceNode = undefined;

  private startedAt = 0;

  private pausedAt = 0;

  private isRunning = false;

  private wasPlayingBeforeSeek = false;

  constructor(audioFile: Blob) {
    this.audiFile = audioFile;
    this.context = new AudioContext();
  }

  public init(parent: HTMLElement | null) {
    return new Promise((resolve, reject) => {
      if (!parent) {
        reject(new Error("Parent element not found"));
        return;
      }

      const reader = new FileReader();
      reader.readAsArrayBuffer(this.audiFile);
      reader.onload = (event) =>
        this.loadSound(event).then((buffer) => {
          this.audioBuffer = buffer;
          this.drawer = new Drawer(buffer, parent);

          this.drawer.setSeekPreviewCallback((time) => {
            this.previewSeek(time);
          });

          this.drawer.setSeekStartCallback(() => {
            this.wasPlayingBeforeSeek = this.isRunning;
            this.pause(false);
          });

          this.drawer.setSeekCallback((time) => {
            this.seekTo(time);
            if (this.wasPlayingBeforeSeek) {
              this.play();
            }
          });

          resolve(undefined);
        });
      reader.onerror = reject;
    });
  }

  private loadSound(readerEvent: ProgressEvent<FileReader>) {
    if (!readerEvent?.target?.result) {
      throw new Error("Can not read file");
    }

    return this.context.decodeAudioData(
      readerEvent.target.result as ArrayBuffer
    );
  }

  public async play() {
    if (!this.audioBuffer) {
      throw new Error(
        "Play error. Audio buffer is not exists. Try to call loadSound before Play."
      );
    }

    if (this.isRunning) return;

    this.gainNode = this.context.createGain();

    this.bufferSource = this.context.createBufferSource();
    this.bufferSource.buffer = this.audioBuffer;

    this.bufferSource.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);

    await this.context.resume();
    this.bufferSource.start(0, this.pausedAt);

    this.startedAt = this.context.currentTime - this.pausedAt;
    this.isRunning = true;

    const duration = this.audioBuffer.duration;

    const tick = () => {
      if (!this.isRunning) return;
      const currentTime = this.context.currentTime - this.startedAt;
      this.drawer?.updateCursor(currentTime, duration);
      requestAnimationFrame(tick);
    };
    tick();
  }

  public async pause(reset: boolean) {
    if (!this.isRunning) {
      this.pausedAt = reset ? 0 : this.pausedAt;
      return;
    }

    if (!this.bufferSource || !this.gainNode) {
      throw new Error(
        "Pause - bufferSource is not exists. Maybe you forgot to call Play before?"
      );
    }

    await this.context.suspend();

    this.pausedAt = reset ? 0 : this.context.currentTime - this.startedAt;

    if (reset) {
      this.pausedAt = 0;
      this.drawer?.updateCursor(0, this.audioBuffer!.duration);
    }

    this.bufferSource.stop(this.pausedAt);
    this.bufferSource.disconnect();
    this.gainNode.disconnect();

    this.isRunning = false;
  }

  public changeVolume(volume: number) {
    if (!this.gainNode) {
      return;
    }

    this.gainNode.gain.value = volume;
  }

  public drawChart() {
    this.drawer?.init();
  }

  public seekTo(time: number) {
    if (!this.audioBuffer) return;
    this.pause();
    this.pausedAt = time;

    this.drawer?.updateCursor(time, this.audioBuffer.duration);
  }

  public previewSeek(time: number) {
    if (!this.audioBuffer) return;
    this.drawer?.updateCursor(time, this.audioBuffer.duration);
  }
}

export default SoundDriver;

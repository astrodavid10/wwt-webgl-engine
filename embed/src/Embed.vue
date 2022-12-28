<template>
  <div id="app">
    <WorldWideTelescope
      wwt-namespace="wwt-embed"
      v-bind:style="{
        height: wwtComponentLayout.height,
        top: wwtComponentLayout.top,
      }"
    ></WorldWideTelescope>

    <transition name="fade">
      <div class="modal" id="modal-loading" v-show="isLoadingState">
        <div class="container">
          <div class="spinner"></div>
          <p>Loading …</p>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div
        class="modal"
        id="modal-readytostart"
        v-show="isReadyToStartState"
        @click="startInteractive()"
      >
        <div>
          <font-awesome-icon class="icon" icon="play"></font-awesome-icon>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div id="overlays">
        <p v-show="embedSettings.showCoordinateReadout">{{ coordText }}</p>
      </div>
    </transition>

    <div class="image-description" v-show="showImageDescription">
      <a class="close-button" @click="showImageDescription = false">×</a>
      <h1>
        Interactively explore James Webb Space Telescope (JWST) Imagery!
      </h1>

			<p>
				JWST launched on Dec 25th, 2021 - after a month long deployment and several months of precise mirror alignment and  instrument calibration, the first images were released to the public on July 11th and 12th.

      <p>
        Pan and zoom to explore these images interactively. Select the thumbnails (top left) to view JWST astro-imagery in context of the sky. Using the menu (top left), change the background imagery to compare against different surveys and wavelengths.
			</p>
			
			<p>
				Interactive created by <a href="https://twitter.com/ADavidWeigel">A. David Weigel</a>, <a href="https://twitter.com/pkgw">Peter K. G. Williams</a>, and Jon Carifio
			</p>

      <p class="more">
        <!-- This trick redirects the click through the bit.ly link so we can count clicks -->
        <a
          target="_blank"
          href="https://rocketcenter.com/INTUITIVEplanetarium"
          @click.prevent="openSourceLink"
          >🚀 Learn more about JWST at the <i>INTUITIVE</i><sup>®</sup> Planetarium at the U.S. Space & Rocket Center …</a
        >
      </p>

      <!-- <p class="credits">
        Credit: NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI).
      </p> -->
    </div>

		<div class="image-name" v-if="curForegroundImagesetName !== null && showImageName" @click="showImageName = false">
      <h1>
			{{ curForegroundImagesetName }}
      </h1>
		</div>
		
		<div id="left-content">
      <folder-view
        v-if="collectionFolder !== null && showFolderView"
        id="folder-view"
        flex-direction="column"
        :root-folder="collectionFolder"
      />
    </div>

    <ul id="controls">
      <li v-show="showToolMenu">
        <v-popover placement="left">
          <font-awesome-icon
            class="tooltip-target"
            icon="sliders-h"
            size="lg"
          ></font-awesome-icon>
          <template slot="popover">
            <ul class="tooltip-content tool-menu">
              <li v-show="showCrossfader">
                <a href="#" v-close-popover @click="selectTool('crossfade')"
                  ><font-awesome-icon icon="adjust" /> Crossfade</a
                >
              </li>
              <li v-show="showBackgroundChooser">
                <a
                  href="#"
                  v-close-popover
                  @click="selectTool('choose-background')"
                  ><font-awesome-icon icon="mountain" /> Choose background</a
                >
              </li>
              <li>
                <a href="#" v-close-popover @click="toggleImageDescription()"
                  ><font-awesome-icon icon="toggle-off" /> Toggle description</a
                >
              </li>
              <li v-show="showPlaybackControls">
                <a
                  href="#"
                  v-close-popover
                  @click="selectTool('playback-controls')"
                  ><font-awesome-icon icon="redo" /> Tour player controls</a
                >
              </li>
              <li>
                <a
                  href="https://worldwidetelescope.org/connect/"
                  target="_blank"
                  v-close-popover
                  ><font-awesome-icon icon="heart" /> Connect with WWT!</a
                >
              </li>
            </ul>
          </template>
        </v-popover>
      </li>
      <li v-show="!wwtIsTourPlaying">
        <font-awesome-icon
          icon="search-plus"
          size="lg"
          @click="doZoom(true)"
        ></font-awesome-icon>
      </li>
      <li v-show="!wwtIsTourPlaying">
        <font-awesome-icon
          icon="search-minus"
          size="lg"
          @click="doZoom(false)"
        ></font-awesome-icon>
      </li>
      <li v-show="fullscreenAvailable">
        <font-awesome-icon
          v-bind:icon="fullscreenModeActive ? 'compress' : 'expand'"
          size="lg"
          class="nudgeright1"
          @click="toggleFullscreen()"
        ></font-awesome-icon>
      </li>
    </ul>

    <div id="bottom-content">
      <div id="tools">
        <div class="tool-container">
          <template v-if="currentTool == 'crossfade'">
            <span>Foreground opacity:</span>
            <input
              class="opacity-range"
              type="range"
              v-model="foregroundOpacity"
            />
          </template>
          <template v-else-if="currentTool == 'choose-background'">
            <span>Background imagery:</span>
            <select v-model="curBackgroundImagesetName">
              <option
                v-for="bg in backgroundImagesets"
                v-bind:value="bg.imagesetName"
                v-bind:key="bg.imagesetName"
              >
                {{ bg.displayName }}
              </option>
            </select>
          </template>
          <template v-else-if="currentTool == 'playback-controls'">
            <div class="playback-controls">
              <font-awesome-icon
                v-bind:icon="tourPlaybackIcon"
                size="lg"
                class="clickable"
                @click="tourPlaybackButtonClicked()"
              ></font-awesome-icon>
              <vue-slider
                class="scrubber"
                v-model="twoWayTourTimecode"
                :max="wwtTourRunTime"
                :marks="wwtTourStopStartTimes"
                :tooltip-formatter="formatTimecode"
                :adsorb="true"
                :duration="0"
                :interval="0.001"
                :contained="true"
                :hide-label="true"
                :use-keyboard="false"
              ></vue-slider>
            </div>
          </template>
        </div>
      </div>

      <div id="credits" v-show="embedSettings.creditMode == CreditMode.Default">
        <div id="network-sharing-container">
          <ShareNetwork
            v-for="network in networks"
            :key="network.name"
            :network="network.name"
            :class="`${network.name}-button`"
            :style="{ backgroundColor: network.color, width: 'fit-content' }"
            :description="description"
            :url="url"
            :title="description"
            :hashtags="hashtagString"
            :quote="description"
            twitter-user="WWTelescope"
          >
            <font-awesome-icon
              :class="`${network.name}-icon`"
              :style="{ padding: '0px 4px 0px 2px' }"
              :icon="['fab', network.name]"
              size="lg"
            ></font-awesome-icon>
            <span>{{ network.text }}</span>
          </ShareNetwork>
          <a
            href="https://bit.ly/wwtdonate22"
            target="_blank"
            class="support-button"
            style="background-color: #f056b0; width: fit-content"
          >
            <font-awesome-icon
              class="heart-icon"
              :style="{ padding: '0px 4px 0px 2px' }"
              icon="heart"
              size="lg"
            ></font-awesome-icon>
            <span>Support WWT</span>
          </a>
        </div>
        <p>
          Powered by
          <a href="https://worldwidetelescope.org/home/" target="_blank"
            >AAS WorldWide Telescope</a
          >
          <a href="https://worldwidetelescope.org/home/" target="_blank"
            ><img alt="WWT Logo" src="./assets/logo_wwt.png"
          /></a>
          <a href="https://aas.org/" target="_blank"
            ><img alt="AAS Logo" src="./assets/logo_aas.png"
          /></a>
          <a
            href="https://github.com/pkgw/wwt-webgl-engine/tree/special-2022-jwst-ceers#readme"
            target="_blank"
            ><img alt="GitHub Logo" src="./assets/logo_github.png"
          /></a>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";

import * as screenfull from "screenfull";

import { fmtDegLat, fmtDegLon, fmtHours } from "@wwtelescope/astro";
import { Folder, FolderUp, Place, Imageset } from "@wwtelescope/engine";
import { ImageSetType } from "@wwtelescope/engine-types";
import {
  SetupForImagesetOptions,
  WWTAwareComponent,
} from "@wwtelescope/engine-vuex";
import { CreditMode, EmbedSettings } from "@wwtelescope/embed-common";
import { Meta } from "@sophosoft/vue-meta-decorator";

/** The overall state of the WWT embed component. */
enum ComponentState {
  /** Waiting for resources and/or content to load. Not yet ready to start. */
  LoadingResources,

  /** Resources have loaded. We can start when the user activates us. */
  ReadyToStart,

  /** The user has activated us. */
  Started,
}

type ToolType = "crossfade" | "choose-background" | "playback-controls" | null;

class BackgroundImageset {
  public imagesetName: string;
  public displayName: string;

  constructor(displayName: string, imagesetName: string) {
    this.displayName = displayName;
    this.imagesetName = imagesetName;
  }
}

const skyBackgroundImagesets: BackgroundImageset[] = [
  new BackgroundImageset(
    "Optical (Terapixel DSS)",
    "Digitized Sky Survey (Color)"
  ),
	new BackgroundImageset(
    "PanSTARRS1 3Pi (Optical)",
    "PanSTARRS1 3Pi"
  ),
	new BackgroundImageset(
    "NASA Deep Star Maps (Optical)",
    "NASA SVS Deep Star Maps 2020 (Synthetic, Optical)"
  ),
  new BackgroundImageset(
    "Low-frequency radio (VLSS)",
    "VLSS: VLA Low-frequency Sky Survey (Radio)"
  ),
  new BackgroundImageset("Infrared (2MASS)", "2Mass: Imagery (Infrared)"),
  new BackgroundImageset("GLIMPSE 360 (IR)", "GLIMPSE 360"),
  new BackgroundImageset("Ultraviolet (GALEX)", "GALEX (Ultraviolet)"),
  new BackgroundImageset(
    "X-Ray (ROSAT RASS)",
    "RASS: ROSAT All Sky Survey (X-ray)"
  ),
  new BackgroundImageset(
    "Gamma Rays (FERMI LAT 8-year)",
    "Fermi LAT 8-year (gamma)"
  ),
];

type Shape = { width: number; height: number };
const defaultWindowShape: Shape = { width: 1200, height: 900 };

type WwtComponentLayout = { top: string; height: string };

export type FolderItem = Folder | FolderUp | Imageset | Place;

@Component
export default class Embed extends WWTAwareComponent {
  CreditMode = CreditMode;

  @Prop({ default: new EmbedSettings() })
  readonly embedSettings!: EmbedSettings;
  @Prop({ default: "" }) jwstWtmlUrl!: string;
  @Prop({ default: "" }) url!: string;
  @Prop({ default: "" }) thumbnailUrl!: string;
  @Prop({ default: "" }) bgName!: string;

  componentState = ComponentState.LoadingResources;
  backgroundImagesets: BackgroundImageset[] = [];
  currentTool: ToolType = "crossfade";
  fullscreenModeActive = false;
  tourPlaybackJustEnded = false;
  windowShape = defaultWindowShape;
	
	collectionFolder: Folder | null = null;

  // This is the Tweet text:
  description =
    "Interactively explore a collection of the James Webb Space Telescope astroimagery in context of the sky!";
  hashtags = ["jwst", "unfoldtheuniverse", "1yearofwebb", "wwt"];

  get hashtagString() {
    return this.hashtags.join(",");
  }

  networks = [
    { name: "facebook", color: "#1877f2", text: "Share" },
    { name: "twitter", color: "#1da1f2", text: "Tweet" },
  ];

  get showFolderView() {
    const children = this.collectionFolder?.get_children();
    return children !== null && children !== undefined && children.length > 1;
    //return false;
  }

  get isLoadingState() {
    return this.componentState == ComponentState.LoadingResources;
  }

  get isReadyToStartState() {
    return this.componentState == ComponentState.ReadyToStart;
  }

  showImageDescription = true;
	showImageName = false;

  toggleImageDescription() {
    this.showImageDescription = !this.showImageDescription;
  }
	
	toggleImageName() {
    this.showImageName = !this.showImageName;
  }

  openSourceLink() {
    // Custom link to the target URL so that we can count clicks.
    window.open("https://bit.ly/wwt-rcip");
  }

  get coordText() {
    if (this.wwtRenderType == ImageSetType.sky) {
      return `${fmtHours(this.wwtRARad)} ${fmtDegLat(this.wwtDecRad)}`;
    }

    return `${fmtDegLon(this.wwtRARad)} ${fmtDegLat(this.wwtDecRad)}`;
  }

	get curForegroundImagesetName() {
    if (this.wwtForegroundImageset == null) return "";
    return this.wwtForegroundImageset.get_name();
		
  }

  get curBackgroundImagesetName() {
    if (this.wwtBackgroundImageset == null) return "";
    return this.wwtBackgroundImageset.get_name();
  }

  set curBackgroundImagesetName(name: string) {
    this.setBackgroundImageByName(name);
  }

  get foregroundOpacity() {
    return this.wwtForegroundOpacity;
  }

  set foregroundOpacity(o: number) {
    this.setForegroundOpacity(o);
  }

  get fullscreenAvailable() {
    return screenfull.isEnabled;
  }

  get showBackgroundChooser() {
    if (this.wwtIsTourPlaying) return false;

    // TODO: we should wire in choices for other modes!
    return this.wwtRenderType == ImageSetType.sky;
  }

  get showCrossfader() {
    if (this.wwtIsTourPlaying) return false; // maybe show this if tour player is active but not playing?

    if (
      this.wwtForegroundImageset == null ||
      this.wwtForegroundImageset === undefined
    )
      return false;

    return this.wwtForegroundImageset != this.wwtBackgroundImageset;
  }

  get showPlaybackControls() {
    return this.wwtIsTourPlayerActive && !this.wwtIsTourPlaying;
  }

  get showToolMenu() {
    // This should return true if there are any tools to show.
    return (
      this.showBackgroundChooser ||
      this.showCrossfader ||
      this.showPlaybackControls
    );
  }

  created() {
    let prom = this.waitForReady().then(() => {
      for (const s of this.embedSettings.asSettings()) {
        this.applySetting(s);
      }
    });

    if (this.embedSettings.tourUrl.length) {
      prom = prom.then(async () => {
        // TODO: figure out a good thing to do here
        this.backgroundImagesets = [...skyBackgroundImagesets];

        await this.loadTour({
          url: this.embedSettings.tourUrl,
          play: false,
        });

        this.componentState = ComponentState.ReadyToStart;
        this.setTourPlayerLeaveSettingsWhenStopped(true);
        this.currentTool = "playback-controls";
      });
    } else {
      // Many more possibilities if we're not playing a tour ...
      if (this.embedSettings.wtmlUrl.length) {
        prom = prom.then(async () => {
          const folder = await this.loadImageCollection({
            url: this.embedSettings.wtmlUrl,
            loadChildFolders: false,
          });

          if (this.embedSettings.wtmlPlace) {
            // Currently, there is an issue with the `places` field of a `Folder`
            // object populating correctly. Thus, we iterate over `children` instead
            for (const pl of folder.get_children() ?? []) {
              if (!(pl instanceof Place)) {
                continue;
              }
              if (pl.get_name() == this.embedSettings.wtmlPlace) {
                /* This is nominally an async Action, but with `instant: true` it's ... instant */
                this.gotoTarget({
                  place: pl,
                  noZoom: false,
                  instant: true,
                  trackObject: true,
                });
              }
            }
          }
        });
      }

      prom.then(() => {
        // setupForImageset() will apply a default background that is appropriate
        // for the foreground, but we want to be able to override it.

        let backgroundWasInitialized = false;
        let bgName = this.embedSettings.backgroundImagesetName;

        if (this.embedSettings.foregroundImagesetName.length) {
          const img = this.lookupImageset(
            this.embedSettings.foregroundImagesetName
          );

          if (img !== null) {
            // If the imageset is a panorama, we want to set it to be the background
            const isPanorama = img.get_dataSetType() == ImageSetType.panorama;
            const options: SetupForImagesetOptions = { foreground: img };
            if (isPanorama) {
              options.background = img;
              backgroundWasInitialized = true;
            }

            // For setup of planetary modes to work, we need to pass the specified
            // background imageset to setupForImageset().
            // For a panorama, we've already set the imageset itself as the background
            if (!isPanorama && bgName.length) {
              const bkg = this.lookupImageset(bgName);
              if (bkg !== null) {
                options.background = bkg;
                backgroundWasInitialized = true;
              }
            }

            this.setupForImageset(options);
          }
        }
				
				this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.curBackgroundImagesetName = this.bgName;
          this.backgroundImagesets.unshift(
            new BackgroundImageset("unWISE (IR)","unWISE color, from W2 and W1 bands")
          );
				});
				
				/*
        this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.curBackgroundImagesetName = this.bgName;
          this.backgroundImagesets.unshift(
            new BackgroundImageset("JWST - Pillars of Creation (NIRCam)", "Webb Takes a Stunning, Star-Filled Portrait of the Pillars of Creation")
          );
				});
				
				this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.curBackgroundImagesetName = this.bgName;
          this.backgroundImagesets.unshift(
            new BackgroundImageset("JWST - Pillars of Creation (MIRI)", "Pillars of Creation (MIRI Image)")
          );
				});
				
				this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.curBackgroundImagesetName = this.bgName;
          this.backgroundImagesets.unshift(
            new BackgroundImageset("HST - Pillars of Creation (Visible)", "New Hubble View of the Pillars of Creation — Visible")
          );
				});
				
				this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.curBackgroundImagesetName = this.bgName;
          this.backgroundImagesets.unshift(
            new BackgroundImageset("HST - Pillars of Creation (Infrared)", "New Hubble View of the Pillars of Creation — Infrared")
          );
				});
				*/
				this.loadImageCollection({
          url: this.jwstWtmlUrl,
          loadChildFolders: true,
        }).then((folder) => {
          this.collectionFolder = folder;
          const children = folder.get_children();
          if (children === null) {
            return;
          }

          for (const item of children) {
            if (item instanceof Place) {
              this.gotoTarget({
                place: item,
                noZoom: false,
                instant: false,
                trackObject: true,
              });
              break;
            }
          }
        });

        if (!backgroundWasInitialized) {
          if (!bgName.length) {
            // Empty bgname implies that we should choose a default background. If
            // setupForImageset() didn't do that for us, go with:
            bgName = "Digitized Sky Survey (Color)";
          }

          this.setBackgroundImageByName(bgName);
        }

        // TODO: DTRT in different modes.
        this.backgroundImagesets = [...skyBackgroundImagesets];
        let foundBG = false;

        for (const bgi of this.backgroundImagesets) {
          if (bgi.imagesetName == bgName) {
            foundBG = true;
            break;
          }
        }

        if (!foundBG) {
          this.backgroundImagesets.unshift(
            new BackgroundImageset(bgName, bgName)
          );
        }

        this.componentState = ComponentState.Started;
      });
    }
  }

  mounted() {
    if (screenfull.isEnabled) {
      screenfull.on("change", this.onFullscreenEvent);
    }

    window.addEventListener("resize", this.onResizeEvent);
    // ResizeObserver not yet in TypeScript but we should start using it when
    // available. If we're in an iframe, our shape might change spontaneously.
    // const ro = new ResizeObserver(entries => this.onResizeEvent());
    // ro.observer(this.$el);
    this.onResizeEvent();
  }

  destroyed() {
    if (screenfull.isEnabled) {
      screenfull.off("change", this.onFullscreenEvent);
    }

    window.removeEventListener("resize", this.onResizeEvent);
  }

  selectTool(name: ToolType) {
    if (this.currentTool == name) {
      this.currentTool = null;
    } else {
      this.currentTool = name;
    }
  }

  doZoom(zoomIn: boolean) {
    if (zoomIn) {
      this.zoom(1 / 1.3);
    } else {
      this.zoom(1.3);
    }
  }

  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }

  onFullscreenEvent() {
    // NB: we need the isEnabled check to make TypeScript happy even though it
    // is not necessary in practice here.
    if (screenfull.isEnabled) {
      this.fullscreenModeActive = screenfull.isFullscreen;
    }
  }

  onResizeEvent() {
    const width = this.$el.clientWidth;
    const height = this.$el.clientHeight;

    if (width > 0 && height > 0) {
      this.windowShape = { width, height };
    } else {
      this.windowShape = defaultWindowShape;
    }
  }

  startInteractive() {
    this.componentState = ComponentState.Started;

    if (this.embedSettings.tourUrl.length) {
      this.startTour();
    }
  }

  get tourPlaybackIcon() {
    if (this.tourPlaybackJustEnded) {
      return "undo-alt";
    }

    if (this.wwtIsTourPlaying) {
      return "pause";
    }

    return "play";
  }

  tourPlaybackButtonClicked() {
    if (this.wwtIsTourPlayerActive) {
      // If we're playing and our window is tall, we have styling active that
      // keeps the WWT widget in a widescreen-ish format to preserve tour
      // layout. If we're stopping playback, this styling will go away. Since
      // the WWT widget tracks its view height as an angular size, we need to
      // tweak it in order to preserve continuity when the tour is paused. This
      // isn't 100% necessary but is cool when it works. It doesn't work if the
      // pause occurs in a very zoomed-out state, where we can't zoom out any
      // farther because we hit the zoom clamps.
      //
      // Keep this in sync with wwtComponentLayout.
      //
      // TODO: make sure this works in 3D mode.
      let newView = null;

      if (this.wwtIsTourPlaying && this.wwtComponentLayout.top != "0") {
        const curHeight = this.windowShape.width * 0.75;
        newView = {
          raRad: 1.0 * this.wwtRARad,
          decRad: 1.0 * this.wwtDecRad,
          zoomDeg: (this.wwtZoomDeg * this.windowShape.height) / curHeight,
          instant: true,
        };
      }

      if (this.tourPlaybackJustEnded) {
        // Restart from beginning. (seekToTourTimecode() starts playback.)
        this.seekToTourTimecode(0);
        this.tourPlaybackJustEnded = false;
      } else {
        this.toggleTourPlayPauseState();
      }

      if (newView !== null) {
        this.gotoRADecZoom(newView);
      }
    }
  }

  formatTimecode(seconds: number): string {
    if (seconds < 0) return "-:--";

    const minutes = Math.floor(seconds / 60);
    seconds = Math.round(seconds - 60 * minutes);
    return minutes.toString() + ":" + seconds.toString().padStart(2, "0");
  }

  get twoWayTourTimecode() {
    return this.wwtTourTimecode;
  }

  set twoWayTourTimecode(code: number) {
    this.seekToTourTimecode(code);
    this.tourPlaybackJustEnded = false;
  }

	@Watch("curForegroundImagesetName")
	onCurForegroundImagesetNameChanged()
	{
		if(this.curForegroundImagesetName != null){
			this.showImageName = true;
		}
	}
	
	@Watch("curBackgroundImagesetName")
	onCurBackgroundImagesetNameChanged()
	{
		if(this.curBackgroundImagesetName != null){
			this.currentTool = "crossfade";
		}
	}

  @Watch("wwtTourCompletions")
  onTourCompletionsChanged(_count: number) {
    this.tourPlaybackJustEnded = true;
  }

  // This property is used to achieve a widescreen effect when playing tours
  // back on a portrait-mode screen, such as on a mobile device. Tours have to
  // be designed with a target screen aspect ratio in mind, so without the
  // widescreen effect the content will get cut off.
  //
  // Keep this in sync with toggleTourPlayback.
  get wwtComponentLayout(): WwtComponentLayout {
    if (this.wwtIsTourPlaying) {
      if (this.windowShape.height > this.windowShape.width) {
        const wwtHeight = this.windowShape.width * 0.75; // => 4:3 aspect ratio
        const height = wwtHeight + "px";
        const top = 0.5 * (this.windowShape.height - wwtHeight) + "px";
        return { top, height };
      }
    }
    return { top: "0", height: "100%" };
  }
}
</script>

<style lang="less">
@font-face {
  font-family: "Roboto Condensed";
  font-style: normal;
  font-weight: 400;
  src: url(./assets/googlewebfont-RobotoCondensed-Regular.ttf)
    format("truetype");
}

@font-face {
  font-family: "Roboto Condensed";
  font-style: italic;
  font-weight: 400;
  src: url(./assets/googlewebfont-RobotoCondensed-Italic.ttf) format("truetype");
}

@font-face {
  font-family: "Roboto Condensed";
  font-style: normal;
  font-weight: 700;
  src: url(./assets/googlewebfont-RobotoCondensed-Bold.ttf) format("truetype");
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
}

body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;

  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;

  .wwtelescope-component {
    position: relative;
    top: 0;
    width: 100%;
    height: 100%;
    border-style: none;
    border-width: 0;
    margin: 0;
    padding: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;

  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    .spinner {
      background-image: url("assets/lunar_loader.gif");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }

    p {
      margin: 0 0 0 1rem;
      padding: 0;
      font-size: 150%;
    }
  }
}

#modal-readytostart {
  cursor: pointer;
  color: #999;

  &:hover {
    color: #2aa5f7;
  }

  div {
    margin: 0;
    padding: 0;
    background-image: url("assets/wwt_globe_bg.png");
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    width: 20rem;
    height: 20rem;
    max-width: 70%;
    max-height: 70%;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon {
      width: 60%;
      height: 60%;
      margin-left: 14%;
      margin-top: 3%;
    }
  }
}

#overlays {
  position: absolute;
  z-index: 10;
  top: 0.5rem;
  left: 0.5rem;
  color: #fff;

  p {
    margin: 0;
    padding: 0;
    line-height: 1;
  }
}

.image-description {
  position: absolute;
  bottom: 7rem;
  left: 0px;
  width: calc(~"min(100% - 2rem, 40rem)");
  max-height: 25%;
  margin-left: 50vw;
  transform: translateX(-50%);
  overflow-y: auto;
  color: #fff;
  font-family: "Roboto Condensed", Verdana, Arial, Helvetica, sans-serif;
  font-size: 85%;
  background-color: rgba(255, 255, 255, 0.07);
	border-radius: 20px;
  padding: 0.5rem;
	
	&::-webkit-scrollbar {
    padding: 1px;
    height: 3px;
		width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.07);
  }

  &::-webkit-scrollbar-thumb {
    background: #1671e0;
    border-radius: 10px;
  }

	&:hover {
		box-sizing: content-box;
		box-shadow: 0px 0px 6px 0px #1671e0;
		transition: all 200ms ease-out;
  }

  .close-button {
    float: right;
    font-size: 2rem;
    width: 1rem;
    height: 1rem;
    line-height: 1rem;
    text-align: center;

    &:hover {
      cursor: pointer;
    }
  }

  h1 {
    font-size: 150%;
    font-weight: bold;
    margin: 0px 0px 1rem 0px;
  }

  .more {
    font-weight: bold;
  }

  .credits {
    font-style: italic;
    font-size: 90%;
    margin: 0px;
  }

  a {
    color: #b4defa;
    text-decoration: none;

    &:hover {
      color: #1671e0;
    }
  }
}

.image-name {
  position: absolute;
  top: 2rem;
  left: 0px;
	width: auto;
	height: auto;
  max-width: calc(~"min(40%, 40rem)");
  max-height: 15%;
  margin-left: 50vw;
	text-align: center;
	align-items: center;
  transform: translateX(-50%);
  overflow-y: auto;
  color: #fff;
  font-family: "Roboto Condensed", Verdana, Arial, Helvetica, sans-serif;
  font-size: 85%;
  background-color: rgba(255, 255, 255, 0.07);
	border-radius: 20px;
  padding: 0.5rem;
	text-overflow: ellipsis;
  overflow: hidden;
	text-shadow: 1px 1px 3px #000000;

  &:hover {
		box-sizing: content-box;
		box-shadow: 0px 0px 6px 0px #1671e0;
		transition: all 200ms ease-out;
  }

  h1 {
    font-size: 130%;
    font-weight: bold;
    margin: 0.5rem 0.5rem 0.5rem 0.5rem;
  }

  .more {
    font-weight: bold;
  }

  .credits {
    font-style: italic;
    font-size: 90%;
    margin: 0px;
  }

  a {
    color: #b4defa;
    text-decoration: none;

    &:hover {
      color: #1671e0;
    }
  }
}

#bottom-content {
  display: flex;
  flex-direction: column;
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  width: calc(100% - 1rem);
  pointer-events: none;
  align-items: center;
  gap: 25px;
}

#controls {
  position: absolute;
  z-index: 10;
  top: 0.5rem;
  right: 0.5rem;
  color: #fff;

  list-style-type: none;
  margin: 0;
  padding: 0;

  li {
    padding: 3px;
    height: 22px;
    cursor: pointer;

    .nudgeright1 {
      padding-left: 3px;
    }
  }
}

#tools {
  z-index: 10;
  color: #fff;

  .opacity-range {
    width: 50vw;
  }

  .clickable {
    cursor: pointer;
  }
}

.playback-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 75vw;

  .clickable {
    margin: 0 8px;
    cursor: pointer;
  }

  .scrubber {
    flex: 1;
    cursor: pointer;
  }
}

.tool-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
}

#credits {
  color: #ddd;
  font-size: 70%;
  justify-self: flex-end;
  align-self: flex-end;

  p {
    margin: 0;
    padding: 0;
    line-height: 1;
  }

  a {
    text-decoration: none;
    color: #fff;
    pointer-events: auto;

    &:hover {
      text-decoration: underline;
    }

    &[class^="share-network"]:hover {
      text-decoration: none;
      filter: brightness(75%);
    }
  }

  img {
    height: 24px;
    vertical-align: middle;
    margin: 2px;
  }
}

/* Generic v-tooltip CSS derived from: https://github.com/Akryum/v-tooltip#sass--less */

.tooltip {
  display: block !important;
  z-index: 10000;

  .tooltip-inner {
    background: black;
    color: white;
    border-radius: 16px;
    padding: 5px 10px 4px;
  }

  .tooltip-arrow {
    width: 0;
    height: 0;
    border-style: solid;
    position: absolute;
    margin: 5px;
    border-color: black;
    z-index: 1;
  }

  &[x-placement^="top"] {
    margin-bottom: 5px;

    .tooltip-arrow {
      border-width: 5px 5px 0 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      bottom: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }

  &[x-placement^="bottom"] {
    margin-top: 5px;

    .tooltip-arrow {
      border-width: 0 5px 5px 5px;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-top-color: transparent !important;
      top: -5px;
      left: calc(50% - 5px);
      margin-top: 0;
      margin-bottom: 0;
    }
  }

  &[x-placement^="right"] {
    margin-left: 5px;

    .tooltip-arrow {
      border-width: 5px 5px 5px 0;
      border-left-color: transparent !important;
      border-top-color: transparent !important;
      border-bottom-color: transparent !important;
      left: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }

  &[x-placement^="left"] {
    margin-right: 5px;

    .tooltip-arrow {
      border-width: 5px 0 5px 5px;
      border-top-color: transparent !important;
      border-right-color: transparent !important;
      border-bottom-color: transparent !important;
      right: -5px;
      top: calc(50% - 5px);
      margin-left: 0;
      margin-right: 0;
    }
  }

  &.popover {
    .popover-inner {
      background: #f9f9f9;
      color: black;
      padding: 8px;
      border-radius: 5px;
    }

    .popover-arrow {
      border-color: #f9f9f9;
    }
  }

  &[aria-hidden="true"] {
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.15s, visibility 0.15s;
  }

  &[aria-hidden="false"] {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.15s;
  }
}

/* Specialized styling for popups */

ul.tool-menu {
  list-style-type: none;
  margin: 0px;
  padding: 0px;

  li {
    padding: 3px;

    a {
      text-decoration: none;
      color: inherit;
      display: block;
      width: 100%;
    }

    svg.svg-inline--fa {
      width: 1.5em;
    }

    &:hover {
      background-color: #000;
      color: #fff;
    }
  }
}

#network-sharing-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 5px;
  flex-shrink: 1;
}

.facebook-button {
  border-radius: 3px;
  padding: 4px;
}

.twitter-button {
  border-radius: 10px;
  padding: 4px 8px;
}

.support-button {
  border-radius: 10px;
  padding: 4px 8px;
}

#left-content {
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  height: 40%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
	z-index: 11;
}
</style>
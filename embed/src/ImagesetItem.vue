<template>
  <div
    class="imageset-root"
  >
    <div class="main-container">
      <label
        focusable="false"
        id="name-label"
        class="ellipsize"
        @click="isSelected = !isSelected"
        @keyup.enter="isSelected = !isSelected"
        >{{ imageset.settings.name }}
      </label>
    </div>
    <transition-expand>
      <div v-if="isSelected" class="detail-container">
        <div class="detail-row">
          <span class="prompt">Opacity:</span>
          <vue-slider
            class="scrubber"
            v-model="twoWayOpacity"
            :max="1"
            :duration="0"
            :interval="0.01"
            :contained="true"
            :hide-label="true"
            :use-keyboard="true"
          ></vue-slider>
        </div>
      </div>
    </transition-expand>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Imageset } from "@wwtelescope/engine";

@Component
export default class ImagesetItem extends Vue {
  @Prop() imageset!: Imageset;
  hasFocus = false;
  isSelected = false;

  beforeCreate(): void {
    this.$options.methods = {
      // add mutations and actions here
      ...this.$options.methods
    }
  }
}
</script>
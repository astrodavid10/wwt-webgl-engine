<template>
  <div
    class="pv-root"
  >
    <div class="coord-text">
      <p>{{ coordText }}</p>
    </div>
  </div>  
</template>

<script lang="ts">
import { mapActions } from "vuex";
import { Component, Prop, Vue } from "vue-property-decorator";
import { Folder, Place, Imageset, ImageSetLayer } from "@wwtelescope/engine";
import { ImageSetType, Thumbnail } from "@wwtelescope/engine-types";
import { AddImageSetLayerOptions } from "@wwtelescope/engine-helpers";

function flatten(folder: Folder): Thumbnail[] {
  let items: Thumbnail[] = [];
  folder.get_children().forEach(item => {
    if (item instanceof Place || item instanceof Imageset) {
      items.push(item);
    } else if (item instanceof Folder) {
      items = items.concat(flatten(item));
    }
  });
  return items;
}

@Component
export default class PanelView extends Vue {
  @Prop() rootFolder!: Folder;
  items: Thumbnail[] | null = null;

  addImageSetLayer!: (opts: AddImageSetLayerOptions) => Promise<ImageSetLayer>;

  beforeCreate(): void {
    this.$options.methods = {
      ...this.$options.methods,
      ...mapActions("wwt-embed", [
        "addImageSetLayer"
      ])
    }
  }

  created(): void {
    this.items = flatten(this.rootFolder);
    const isImageset = function (t: Thumbnail): t is Imageset {
      return t instanceof Imageset;
    };
    const imagesets: Imageset[] = this.items.filter(isImageset);
    this.items.forEach(item => {
      if (item instanceof Imageset) {
        this.addImageSetLayer({
          url: item.get_url(),
          name: item.get_name(),
          mode: "preloaded",
          goto: true
        });
      }
    });
  }

}
</script>

<style scoped>

</style>
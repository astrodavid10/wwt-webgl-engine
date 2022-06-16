<template>
  <div
    class="fv-root"
  >
    <div
      v-for="item of folderItems"
      :key="item.get_name()"
      @click="() => selectItem(item)"
    >
      <img :src="item.get_thumbnailUrl()" />
    </div>
  </div>
</template>

<script lang="ts">
import { mapMutations } from "vuex";
import { Component, Prop, Vue } from "vue-property-decorator";
import { Folder, FolderUp, Place, Imageset } from "@wwtelescope/engine";

type FolderItem = Folder | FolderUp | Imageset;

@Component
export default class FolderView extends Vue {
  @Prop() rootFolder!: Folder;
  folder!: Folder;

  setBackgroundImageByName!: (imagesetName: string) => void;
  setForegroundImageByName!: (imagesetName: string) => void;

  beforeCreate(): void {
    this.$options.methods = {
      ...this.$options.methods,
      ...mapMutations("wwt-engine", [
        "setBackgroundImageByName",
        "setForegroundImageByName"
      ])
    };
  }

  created(): void {
    this.folder = this.rootFolder;
    console.log(this);
  }

  selectItem(item: FolderItem): void {
    if (item instanceof Folder) {
      this.folder = item;
    } else if ("parent" in item) {
      this.folder = item.parent;
    } else if (item instanceof Imageset) {
      this.setForegroundImageByName(item.get_name());
      this.setBackgroundImageByName(item.get_name());
    }
    console.log(this.folder.get_children());
  }

  get folderItems() {
    return this.folder.get_children();
  }

}
</script>

<style scoped>
.fv-root {
  display: flex;
  flex-direction: row;
}
</style>
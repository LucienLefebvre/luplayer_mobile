<template>
  <div class="settings-panel">
    <q-expansion-item
      label="Toolbar"
      class="help-part-name"
      group="settings-item-group"
    >
      <div class="help-text">
        <div class="button-row">
          <q-btn icon="vertical_align_top" class="icon" size="sm" />
          <div>Go to the first sound in the playlist</div>
        </div>
        <div class="button-row">
          <q-btn
            icon="low_priority"
            @contextmenu.prevent
            size="sm"
            class="icon"
          />
          Reorder. Long press to multiple reorder
        </div>
        <div class="button-row">
          <q-btn icon="edit" class="icon" size="sm" />
          Edit selected sound
        </div>
        <div class="button-row">
          <q-btn icon="delete" class="icon" size="sm" />
          Delete selected sound
        </div>
        <div class="button-row">
          <q-btn class="icon" size="sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 256 256"
              xmlns="http://www.w3.org/2000/svg"
              fill="orange"
            >
              <path :d="getFadeInSvgPath()" fill-rule="evenodd" />
            </svg>
          </q-btn>
          Fade selected sound
        </div>
      </div>
    </q-expansion-item>
    <q-expansion-item
      label="Playlist mode"
      class="help-part-name"
      group="settings-item-group"
    >
      <div class="help-text">
        Nothing special, each sound is played in turn, and the fader controls
        the sound level of the played sound. At the end of a sound, it
        automatically transitions to the next one.
      </div>
    </q-expansion-item>
    <q-expansion-item
      label="Cart mode"
      class="help-part-name"
      group="settings-item-group"
    >
      <div class="help-text">
        Tap on a sound to play it, tap on it again to stop. The fader controls
        the level of the sound highlighted in yellow. To select a sound to
        control it with the fader or edit it, long press on it.
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
function getFadeInSvgPath() {
  return 'M36 208c-2.21 0-2.619-1.144-.926-2.546L220.926 51.546c1.698-1.406 3.074-.76 3.074 1.464v150.98a4.003 4.003 0 0 1-3.996 4.01h-8.008a3.996 3.996 0 0 1-3.996-4.007V84.007c0-2.213-1.387-2.861-3.079-1.465L56.08 205.458C54.379 206.862 51.209 208 49 208H35.999z';
}
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;

  background-color: var(--bkgColor);
  justify-content: center;
  border: 0px;
  padding: 10px;
}
.help-part-name {
  font-size: 1.1rem;
  color: var(--blueColor);
}
.help-text {
  font-size: 1rem;
  color: orange;
}
.icon {
  color: orange;
  background-color: var(--blueColor);
  margin-right: 10px;
}
.button-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px;
}
</style>

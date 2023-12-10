<template>
  <div>
    <q-card class="panel-class">
      <q-card-section class="row items-center question">
        <q-avatar icon="delete" color="red" class="q-mr-md" />
        <div>
          Delete this sound
          <br />
          "{{ sound?.name }}" ?
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="secondary" v-close-popup />
        <q-btn flat label="Delete" color="red" @click="deleteButtonClicked" />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { defineProps, PropType } from 'vue';
import { SoundModel } from 'src/components/models';
import { useSoundsStore } from 'src/stores/sounds-store';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel | null>, required: true },
});

function deleteButtonClicked() {
  if (props.sound) {
    soundsStore.deleteSound(props.sound);
  }
  soundsStore.showDeleteSoundWindow = false;
}
</script>

<style scoped>
.panel-class {
  background-color: var(--bkgColor);
  padding: 10px;
  border-radius: 10px;
  overflow-y: auto;
  max-width: 100%;
  gap: 10px;
}
.question {
  color: orange;
}
</style>

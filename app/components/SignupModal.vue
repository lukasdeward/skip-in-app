<script setup lang="ts">
const props = withDefaults(defineProps<{
  open?: boolean
}>(), {
  open: false
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const model = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})
</script>

<template>
  <UModal v-model:open="model">
    <template #content>
      <UCard>
        <SignupForm
          :redirect-on-success="false"
        />
      </UCard>
    </template>
  </UModal>
</template>

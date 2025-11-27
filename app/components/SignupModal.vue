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

const linkSent = ref(false)
const lastEmail = ref('')

const resetState = () => {
  linkSent.value = false
  lastEmail.value = ''
}

const onMagicLinkSent = (email: string) => {
  linkSent.value = true
  lastEmail.value = email
}

watch(() => props.open, (open) => {
  if (!open) {
    resetState()
  }
})
</script>

<template>
  <UModal v-model:open="model">
    <template #content>
      <UCard>
        <SignupForm
          v-if="!linkSent"
          :redirect-on-success="false"
          @success="onMagicLinkSent"
        />

        <div
          v-else
          class="space-y-4"
        >
          <UAlert
            color="success"
            variant="subtle"
            icon="i-lucide-mail-check"
            title="Magic link sent"
            :description="`Check ${lastEmail || 'your inbox'} to finish creating your account.`"
          />

          <div class="flex flex-col gap-3 sm:flex-row">
            <UButton
              label="Close"
              color="primary"
              block
              @click="model = false"
            />
            <UButton
              label="Use a different email"
              color="neutral"
              variant="outline"
              block
              @click="resetState"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

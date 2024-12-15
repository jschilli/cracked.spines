<script setup lang="ts">
import type { BookProps } from './types';
import { getStatusColor } from './utils';

defineProps<{
  status: BookProps['status'];
}>();
</script>

<template>
  <span :class="['px-2 py-1 rounded-full text-sm font-medium', getStatusColor(status)]">
    {{ status }}
  </span>
</template>
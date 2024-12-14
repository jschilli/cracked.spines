<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">Camp Lake James Mens Book Club</h1>
    <nav class="flex gap-4 mb-8">
      <NuxtLink 
        v-for="(displayName, status) in statusMap" 
        :key="status"
        :to="'/' + status.toLowerCase()"
        class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        {{ displayName }}
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const statusMap = {
  'Selected': 'Selected',
  'Candidate': 'Candidates',
  'Read': 'Read',
  'Relegated': 'Relegated'
};
</script> 
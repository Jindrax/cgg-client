<template>
  <q-page class="flex flex-center over" :class="{'bg-black': unlogged}">
    <img v-show="unlogged" alt="Quasar logo" src="~assets/logo.jpg" class="fit over">
    <div v-show="!unlogged">
      <q-field label="Saldo: ">
      </q-field>
      <q-field label="Minutos Restantes: ">
      </q-field>
    </div>
  </q-page>
</template>

<style>
.fit{
  max-width: 88%;
  max-height: 85%;
  object-fit: fill
}
.over{
  overflow: hidden;
}
</style>

<script>
export default {
  name: 'PageIndex',
  props: ['unlogged'],
  data(){
    return {
    }
  }
}
</script>

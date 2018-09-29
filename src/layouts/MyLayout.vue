<template>
  <q-layout view="lHh Lpr lFf">
    <q-layout-header>
      <q-toolbar color="primary" :class="{nodrag: unlogged, drag: !unlogged}">
        <q-toolbar-title v-show="unlogged" class="q-my-md">
          Club Gamer Garage
        </q-toolbar-title>
        <q-toolbar-title v-show="!unlogged">
          {{username}}
        </q-toolbar-title>
        <q-field v-show="unlogged" class="text-black q-mx-sm q-px-xs">
          <q-input v-model="username" placeholder="Nombre de usuario" dark/>
        </q-field>
        <q-field v-show="unlogged" class="text-black q-mx-sm q-px-xs">
          <q-input v-model="password" placeholder="Contraseña" dark type="password" no-pass-toggle/>
        </q-field>
        <q-btn icon="ion-log-in" v-if="unlogged" flat dense round @click="login" class="q-mx-sm nodrag" />
        <q-btn icon="ion-log-out" v-if="!unlogged" flat dense round @click="logout" class="q-mx-sm nodrag" />
      </q-toolbar>
    </q-layout-header>
    <q-page-container>
      <q-page class="flex flex-center over" :class="{'bg-black': unlogged}">
        <img v-show="unlogged" alt="Quasar logo" src="~assets/logo.jpg" class="fit over">
        <sesion v-if="sesion != null && !unlogged" :sesion="sesion" :socket="getSocket()" ref="sesion" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { setTimeout } from "timers";
import Sesion from "../components/sesion.vue";
var socketIOClient = require("socket.io-client");
var sailsIOClient = require("sails.io.js");
var io = sailsIOClient(socketIOClient);
io.sails.reconnection = true;
io.sails.url = "http://192.168.1.5:1337";

export default {
  name: "MyLayout",
  data() {
    return {
      sesion: null,
      username: "",
      password: "",
      unlogged: true,
      settings: null
    };
  },
  created() {
    this.$q.electron.ipcRenderer.on("logged_in", event => {
      this.unlogged = false;
      let notification = new Notification("Usuario conectado", {
        body: `El usuario ${this.username} ha iniciado sesion correctamente.`
      });
    });
    this.$q.electron.ipcRenderer.on("logged_out", event => {
      this.sesion = null;
      this.unlogged = true;
      this.username = "";
      this.password = "";
    });
    this.$q.electron.ipcRenderer.on("settings_ret", (event, settings) => {
      this.settings = settings;
    });
    this.$q.electron.ipcRenderer.on("settings_set", (event, settings) => {
      this.settings = settings;
      this.register();
    });
    this.$q.electron.ipcRenderer.send("getSettings");
  },
  mounted() {
    io.socket.on("connect", () => {
      this.register();
    });
  },
  beforeDestroy() {
    this.$q.electron.ipcRenderer.removeAllListeners("logged_in");
    this.$q.electron.ipcRenderer.removeAllListeners("logged_out");
    this.$q.electron.ipcRenderer.removeAllListeners("settings_ret");
    this.$q.electron.ipcRenderer.removeAllListeners("settings_set");
  },
  methods: {
    login: function() {
      if (this.username == "setEquipo") {
        this.setEquipo(Number(this.password));
      } else {
        io.socket.post(
          "/login",
          {
            username: this.username,
            password: this.password,
            equipo: this.settings.equipo
          },
          (response, jwRes) => {
            if (jwRes.statusCode != 200) {
              this.$q.notify(response);
            } else {
              this.sesion = response;
              this.$q.electron.ipcRenderer.send("log_in");
            }
          }
        );
      }
    },
    register: function() {
      if (this.settings != null) {
        io.socket.post("/register", { equipo: this.settings.equipo });
      } else {
        this.$q.electron.ipcRenderer.send("getSettings");
        setTimeout(() => {
          this.register();
        }, 500);
      }
    },
    setEquipo: function(equipo) {
      this.$q.notify(`Se ha configurado el equipo como: ${equipo}`);
      this.$q.electron.ipcRenderer.send("setSettings", { equipo: equipo });
    },
    getSocket: function() {
      return io.socket;
    },
    logout: function() {
      this.$refs.sesion.logout();
    }
  },
  components: {
    Sesion
  }
};
</script>

<style>
.drag {
  -webkit-app-region: drag;
}
.nodrag {
  -webkit-app-region: no-drag;
}
.over {
  overflow: hidden;
}
.fit {
  max-width: 88%;
  max-height: 85%;
  object-fit: fill;
}
.info {
  font-size: 15vh;
}
</style>

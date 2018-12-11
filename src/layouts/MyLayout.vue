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
          <q-input v-model="username" placeholder="Nombre de usuario" dark />
        </q-field>
        <q-field v-show="unlogged" class="text-black q-mx-sm q-px-xs">
          <q-input v-model="password" placeholder="Contraseña" dark type="password" no-pass-toggle />
        </q-field>
        <q-btn icon="ion-log-in" v-if="unlogged" flat dense round @click="login" class="q-mx-sm nodrag" />
        <q-btn icon="ion-log-out" v-if="!unlogged" flat dense round @click="logout" class="q-mx-sm nodrag" />
        <q-btn icon="ion-close-circle-outline" v-if="!unlogged && isAdmin" flat dense round @click="close" class="q-mx-sm nodrag" />
      </q-toolbar>
    </q-layout-header>
    <q-page-container>
      <q-page class="flex flex-center over" :class="{'bg-black': unlogged}">
        <img v-show="unlogged" alt="Quasar logo" src="~assets/logo.jpg" class="fit over">
        <sesion v-if="sesion != null && !unlogged" :sesion="sesion" :socket="getSocket()" :username="username" :equipo="settings.equipo" ref="sesion" />
      </q-page>
    </q-page-container>
    <q-modal v-model="opened">
      <q-modal-layout>
        <q-toolbar slot="header">
          <q-btn flat round dense v-close-overlay icon="keyboard_arrow_left" />
          <q-toolbar-title>
            Información Adicional
          </q-toolbar-title>
        </q-toolbar>
        <q-card>
          <q-card-title>
            Llene la información para iniciar sesion
          </q-card-title>
          <q-card-separator />
          <q-card-main>
            <div class="row">
              <q-field label="Nombres" style="width: 100%">
                <q-input v-model="info.nombres" />
              </q-field>
            </div>
            <div class="row">
              <q-field label="Apellidos" style="width: 100%">
                <q-input v-model="info.apellidos" />
              </q-field>
            </div>
            <div class="row">
              <q-field label="E-mail" style="width: 100%">
                <q-input v-model="info.email" />
              </q-field>
            </div>
            <div class="row">
              <q-field label="Telefono" style="width: 100%">
                <q-input v-model="info.telefono" />
              </q-field>
            </div>
            <div class="row">
              <q-field label="Fecha de nacimiento" style="width: 100%">
                <q-datetime v-model="info.nacimiento" float-label="Inicio" format-model="number" />
              </q-field>
            </div>
            <br>
            <div class="row">
              <q-btn label="Guardar" style="width: 100%" @click="sendInfo" color="primary" />
            </div>
          </q-card-main>
        </q-card>
        <q-toolbar slot="footer">
          <q-toolbar-title>
            El tiempo de la sesion no inicia hasta que complete esta información
          </q-toolbar-title>
        </q-toolbar>
      </q-modal-layout>
    </q-modal>
  </q-layout>
</template>

<script>
import { setTimeout } from "timers";
import Sesion from "../components/sesion.vue";
var socketIOClient = require("socket.io-client");
var sailsIOClient = require("sails.io.js");
var io = sailsIOClient(socketIOClient);
io.sails.reconnection = true;
io.sails.url = "https://cggserver.herokuapp.com/";

export default {
  name: "MyLayout",
  data() {
    return {
      opened: false,
      sesion: null,
      username: "",
      password: "",
      unlogged: true,
      settings: null,
      info: {
        id: "",
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        nacimiento: null
      }
    };
  },
  computed: {
    isAdmin() {
      if (this.sesion != null) {
        if (this.sesion == 0) {
          return true;
        }
      }
      return false;
    }
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
      if (this.username == "close" && this.password == "cGG_1531032816") {
        this.close();
        return;
      }
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
            if (jwRes.statusCode == 200) {
              this.sesion = response;
              this.$q.electron.ipcRenderer.send("log_in");
            } else if (jwRes.statusCode == 206) {
              this.info.id = response;
              this.opened = true;
            } else {
              this.$q.notify(response);
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
    },
    close: function() {
      this.$q.electron.ipcRenderer.send("close");
    },
    sendInfo: function() {
      io.socket.post(
        "/saveinfo",
        {
          info: this.info
        },
        (response, jwRes) => {
          if (jwRes.statusCode == 200) {
            this.info = {
              id: "",
              nombres: "",
              apellidos: "",
              email: "",
              telefono: "",
              nacimiento: null
            };
            this.opened = false;
            this.login();            
          } else {
            this.$q.notify(response);
          }
        }
      );
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

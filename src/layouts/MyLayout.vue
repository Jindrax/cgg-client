<template>
  <q-layout view="lHh Lpr lFf">
    <q-layout-header>
      <q-toolbar color="primary" :class="{nodrag: unlogged, drag: !unlogged}">
        <q-toolbar-title v-show="unlogged" class="q-my-md">Club Gamer Garage</q-toolbar-title>
        <q-toolbar-title v-show="!unlogged">{{username}}</q-toolbar-title>
        <q-field v-show="unlogged" class="text-black q-mx-sm q-px-xs">
          <q-input v-model="username" placeholder="Nombre de usuario" dark/>
        </q-field>
        <q-field v-show="unlogged" class="text-black q-mx-sm q-px-xs">
          <q-input v-model="password" placeholder="Contraseña" dark type="password" no-pass-toggle/>
        </q-field>
        <q-btn
          icon="ion-log-in"
          v-if="unlogged"
          flat
          dense
          round
          @click="login"
          class="q-mx-sm nodrag"
        />
        <q-btn
          icon="ion-log-out"
          v-if="!unlogged"
          flat
          dense
          round
          @click="logout"
          class="q-mx-sm nodrag"
        />
        <q-btn
          icon="ion-close-circle-outline"
          v-if="!unlogged && isAdmin"
          flat
          dense
          round
          @click="close"
          class="q-mx-sm nodrag"
        />
      </q-toolbar>
    </q-layout-header>
    <q-page-container>
      <q-page class="flex flex-center over" :class="{'bg-black': unlogged}">
        <img v-show="unlogged" alt="Quasar logo" src="~assets/logo.jpg" class="fit over">
        <sesion
          v-if="sesion != null && !unlogged"
          :sesion="sesion"
          :socket="getSocket()"
          :username="username"
          :equipo="settings.equipo"
          ref="sesion"
        />
        <p v-if="promo != null && !unlogged" class="info">Promocion valida</p>
      </q-page>
    </q-page-container>
    <q-modal v-model="opened">
      <q-modal-layout>
        <q-toolbar slot="header">
          <q-btn flat round dense v-close-overlay icon="keyboard_arrow_left"/>
          <q-toolbar-title>Información Adicional</q-toolbar-title>
        </q-toolbar>
        <q-card>
          <q-card-title>Llene la información para iniciar sesion</q-card-title>
          <q-card-separator/>
          <q-card-main>
            <div class="row">
              <q-field label="Nombres" style="width: 100%">
                <q-input v-model="info.nombres"/>
              </q-field>
            </div>
            <div class="row">
              <q-field label="Apellidos" style="width: 100%">
                <q-input v-model="info.apellidos"/>
              </q-field>
            </div>
            <div class="row">
              <q-field label="E-mail" style="width: 100%">
                <q-input v-model="info.email"/>
              </q-field>
            </div>
            <div class="row">
              <q-field label="Telefono" style="width: 100%">
                <q-input v-model="info.telefono"/>
              </q-field>
            </div>
            <div class="row">
              <q-field label="Fecha de nacimiento" style="width: 100%">
                <q-datetime v-model="info.nacimiento" float-label="Inicio" format-model="number"/>
              </q-field>
            </div>
            <br>
            <div class="row">
              <q-btn label="Guardar" style="width: 100%" @click="sendInfo" color="primary"/>
            </div>
          </q-card-main>
        </q-card>
        <q-toolbar slot="footer">
          <q-toolbar-title>El tiempo de la sesion no inicia hasta que complete esta información</q-toolbar-title>
        </q-toolbar>
      </q-modal-layout>
    </q-modal>
  </q-layout>
</template>

<script>
import { setTimeout } from "timers";
import Sesion from "../components/sesion.vue";

const socketIOClient = require("socket.io-client");
const sailsIOClient = require("sails.io.js");
const io = sailsIOClient(socketIOClient);
io.sails.reconnection = true;
/**
 * Url de conexion con el servidor
 * @type {string}
 */
io.sails.url = process.env.API_URL;

export default {
  name: "MyLayout",
  data() {
    return {
      opened: false,
      //Id de la sesion actual en el cliente, 0 para administradores
      sesion: null,
      //Objeto con informacion sobre la promocion actual en el cliente
      promo: null,
      //Nombre de usuario
      username: "",
      //Contraseña del usuario
      password: "",
      //Bandera que indica si el cliente tiene una sesion iniciada o esta a la espera
      unlogged: true,
      //Configuracion local del cliente
      settings: null,
      //Objeto que contiene la informacion personal del cliente en caso de usar el modal para la recoleccion de informacion
      info: {
        id: "",
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        nacimiento: null
      },
      sesion_interrumpida: null
    };
  },
  computed: {
    /**
     * Propiedad computada que devuelve verdadero si la sesion pertenece a un administrador u operario y falso para los otros casos
     * @returns {boolean} calidad de administrador
     */
    isAdmin() {
      if (this.sesion != null) {
        if (this.sesion === 0) {
          return true;
        }
      }
      return false;
    }
  },
  created() {
    //Escucha el evento en que el cliente ha iniciado sesion correctamente
    this.$q.electron.ipcRenderer.on("logged_in", () => {
      this.unlogged = false;
      new Notification("Usuario conectado", {
        body: `El usuario ${this.username} ha iniciado sesion correctamente.`
      });
    });
    //Escucha el evento en el que el cliente ha cerrado sesion correctamente
    this.$q.electron.ipcRenderer.on("logged_out", () => {
      this.sesion = null;
      this.promo = null;
      this.unlogged = true;
      this.username = "";
      this.password = "";
    });
    //Escucha el evento en el que una configuracion local se he pedido
    this.$q.electron.ipcRenderer.on("settings_ret", (event, settings) => {
      this.settings = settings;
    });
    //Escucha el evento en el que una configuracion local se ha cambiado
    this.$q.electron.ipcRenderer.on("settings_set", (event, settings) => {
      this.settings = settings;
      this.register();
    });
    //Envia un mensaje para solicitar la configuracion local
    this.$q.electron.ipcRenderer.send("getSettings");
  },
  mounted() {
    //Una vez lista la interfaz de la aplicacion se escucha el evento de conexion
    io.socket.on("connect", () => {
      //Cuando el cliente ya esta conectado se registra ante el servidor
      this.register();
      if (this.sesion_interrumpida !== null) {
        io.socket.post(
          "/logout",
          {
            sesion: this.sesion_interrumpida
          },
          (response, jwRes) => {
            if (jwRes.statusCode !== 200) {
              this.$q.notify(response);
            } else {
              this.sesion_interrumpida = null;
              this.$q.notify(response);
            }
          }
        );
      }
    });
    io.socket.on('disconnect', () => {
      //Evento de desconexion recibido
      if(this.sesion !== null){
        this.sesion_interrumpida = this.sesion;
        this.$refs.sesion.liberar_tempo();
        this.$q.notify('Se ha cerrado la sesion debido a que se perdio la conexion con el servidor');
        this.$q.electron.ipcRenderer.send("log_out");
      }
    });
  },
  beforeDestroy() {
    //Antes de eliminar la aplicacion se eliminan todos los escuchas establecidos en la creacion de la aplicacion
    this.$q.electron.ipcRenderer.removeAllListeners("logged_in");
    this.$q.electron.ipcRenderer.removeAllListeners("logged_out");
    this.$q.electron.ipcRenderer.removeAllListeners("settings_ret");
    this.$q.electron.ipcRenderer.removeAllListeners("settings_set");
  },
  methods: {
    /**
     * Funcion que intenta iniciar sesion en el servidor con la informacion suministrada por el usuario
     */
    login: function() {
      //Caso especial en el que el administrador del sistema solicita el cierre de la aplicacion en caso de errores o necesidad de trabajar en el equipo
      if (
        this.username === "close" &&
        this.password === process.env.MASTER_PASS
      ) {
        this.close();
        return;
      }
      //Caso en el que el operario o administrador intenta configurar el identificador del equipo en el sistema
      if (this.username === "setEquipo") {
        this.setEquipo(Number(this.password));
        return;
      }
      io.socket.post(
        "/login",
        {
          username: this.username,
          password: this.password,
          equipo: this.settings.equipo
        },
        /**
         * Callback desde el servidor para la ruta /login
         * @param {Object} response cuerpo de la respuesta con formato:{
         *     tipo: 'op' | 'promo' | 'normal' - Tipo de inicio de sesion determinada por el servidor,
         *     payload: {} | number - Informacion del servidor para el inicio de la sesion y uso del cliente, varia segun el tipo de sesion
         * }
         * @param {Object} jwRes cabeceras de la respuesta, usado para saber el codigo de estado de la respuesta
         */
        (response, jwRes) => {
          if (jwRes.statusCode === 200) {
            //Si el tipo de inicio de sesion es una promocion, no se inicia sesion
            if (response.tipo === "promo") {
              this.promo = response.payload;
            } else {
              //En todos los otros casos se inicia sesion normalmente
              this.sesion = response.payload;
            }
            //Se envia al proceso principal de electron un mensaje de que se ha iniciado sesion para que actualice el proceso renderizador
            this.$q.electron.ipcRenderer.send("log_in");
          } else if (jwRes.statusCode === 206) {
            //Si el servidor solicita informacion sobre el usuario mostramos el modal para recoletar la informacion para su posterior envio al servidor
            this.info.id = response;
            this.opened = true;
          } else {
            //Si nos encontramos con algun codigo de estado erroneo lo notificacion al usuario
            this.$q.notify(response);
          }
        }
      );
    },
    /**
     * Funcion que registra el equipo en el sistema de monitoreo del servidor
     */
    register: function() {
      if (this.settings != null) {
        //Si las configuraciones locales estan listas se hace una peticion al servidor con esta informacion
        io.socket.post("/register", { equipo: this.settings.equipo });
      } else {
        //Si las configuraciones locales no estan listas, se solicitan al proceso principal de electron y se agenda un nuevo intento de registro
        this.$q.electron.ipcRenderer.send("getSettings");
        setTimeout(() => {
          this.register();
        }, 500);
      }
    },
    /**
     * Funcion que se comunica con el proceso principal de electron para fijar la configuracion local del identificador del equipo
     * @param {Number} equipo identificador unico del equipo en el establecimiento
     */
    setEquipo: function(equipo) {
      this.$q.notify(`Se ha configurado el equipo como: ${equipo}`);
      this.$q.electron.ipcRenderer.send("setSettings", { equipo: equipo });
    },
    /**
     * Funcion que retorna la instancia del socket para comunicacion
     * @returns {Socket} objeto de socket.io
     */
    getSocket: function() {
      return io.socket;
    },
    /**
     * Funcion que le solicita a la sesion actual el cierre de la sesion
     */
    logout: function() {
      if (this.sesion != null) {
        this.$refs.sesion.logout();
      } else {
        this.$q.electron.ipcRenderer.send("log_out");
      }
    },
    /**
     * Funcion que solicita al proceso principal de electron la finalizacion de la aplicacion
     */
    close: function() {
      this.$q.electron.ipcRenderer.send("close");
    },
    /**
     * Funcion que envia la informacion recolectada por el modal al servidor
     */
    sendInfo: function() {
      io.socket.post(
        "/saveinfo",
        {
          info: this.info
        },
        /**
         * Callback desde el servidor para la ruta /saveinfo
         * @param response cuerpo de la respuesta - sin informacion valiosa para el proceso
         * @param jwRes cabecera de la respuesta - si el codigo de estado en la respuesta es afirmativo se reinicia la informacion del modal, se oculta y se intenta iniciar sesion
         */
        (response, jwRes) => {
          if (jwRes.statusCode === 200) {
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
            //En caso de un codigo de estado erroneo se notifica al usuario
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

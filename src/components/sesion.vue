<template>
  <div>
    <p class="info">
      Saldo: {{saldo}}
    </p>
    <p class="info">
      Tiempo restante: {{tiempo_restante}}
    </p>
  </div>
</template>

<script>
import { Duration } from "luxon";
import { clearTimeout } from "timers";
export default {
  name: "Sesion",
  /**
   * Propiedades desde el componente padre
   * - sesion, codigo de la sesion con la que se consume
   * - socket, puerto de comunicacion con el servidor
   * - username, nombre de usuario
   * - equipo, identificador del equipo
   */
  props: ["sesion", "socket", "username", "equipo"],
  data() {
    return {
      //Variable para referenciar el temporizador
      timer: null,
      //Variable para referencia el temporizador de los segundos
      timer_segundos: null,
      //Segundos para mostrar
      segundos: 59,
      //Saldo del usuario para mostrar en pantalla
      saldo: 0,
      restante: 0
    };
  },
  computed: {
    /**
     * Propiedad computada que se encarga de convertir los minutos restantes en formato Horas y minutos
     * @returns {string} Cadena de caracteres formateada
     */
    tiempo_restante: function() {
      let tiempo = Duration.fromObject({ minutes: this.restante-1, seconds: this.segundos });
      return tiempo.toFormat("hh:mm:ss");
    }
  },
  mounted() {
    //Cuando la interfaz se ha terminado de cargar, si la sesion no pertenece a un administrador u operario inicia el ciclo de consumo
    if (Number(this.sesion) !== 0) {
      this.consume();
      //this.calcular_segundos();
    }
  },
  methods: {
    /**
     * Funcion encargada de cerrar la sesion, es llamada desde el componente padre y desde el mismo componente
     */
    logout: function() {
      this.socket.post(
        "/logout",
        {
          sesion: this.sesion
        },
        /**
         * Callback desde el servidor para la ruta /logout
         * @param response cuerpo de la respuesta, no contiene informacion relevante para el proceso
         * @param jwRes cabecera de la respuesta, se usa para saber si la peticion se ha realizado correctamente
         */
        (response, jwRes) => {
          if (jwRes.statusCode !== 200) {
            //Si la peticion no se realizo correctamente se notifica al usuario
            this.$q.notify(response);
          } else {
            if (Number(this.sesion) !== 0) {
              //Si la sesion no pertenecia a un administrador u operario se cancela el temporizador
              clearTimeout(this.timer);
            }
            //Se envia un mensaje al proceso principal de electron para que inicie el proceso de cerrar sesion en el cliente
            this.$q.electron.ipcRenderer.send("log_out");
          }
          //Ante cualquier situacion irregular se notifica al usuario
          this.$q.notify(response);
        }
      );
    },
    /**
     * Funcion que se encarga de consumir el saldo por el servicio prestado en el equipo, tiene un caracter periodico
     */
    consume: function() {
      this.socket.post(
        "/consume",
        { sesion: this.sesion },
        /**
         * Callback desde el servidor para la ruta /consume
         * @param response cuerpo de la respuesta, contiene los minutos y el saldo restante del usuario
         * @param jwRes cabecera de la respuesta, se usa para saber si la peticion se ha realizado correctamente
         */
        (response, jwRes) => {
          if (jwRes.statusCode !== 200) {
            /*
            En caso de que no se realice correctamente la primer peticion, se realiza una segunda vez.
            Este comportamiento garantiza tolerancia hacia fallos de red o de colision de peticiones en el servidor
             */
            this.socket.post(
              "/consume",
              {
                sesion: this.sesion
              },
              (response, jwRes) => {
                if (jwRes.statusCode !== 200) {
                  //Si la peticion no se realizo correctamente por segunda vez se notifica al usuario
                  this.$q.notify(response);
                  if (jwRes.statusCode === 402) {
                    //Este codigo de estado indica que la causa por la que la peticion fallo es falta de saldo
                    new Notification("Sesion cerrada", {
                      body: "Te has quedado sin saldo en tu cuenta"
                    });
                  }
                  //Se elimina el temporizador
                  clearTimeout(this.timer);
                  //Se procede a realizar el cierre de sesion
                  this.logout();
                } else {
                  //En caso de que la peticion se haya realizado correctamente se actualizan los valores
                  this.saldo = response.saldo;
                  this.restante = response.restante;
                  if (this.restante === 4) {
                    //Si al usuario le quedan 5 minutos de tiempo disponible se le notifica por medio de Notification de windows
                    //(ACLARACION) se compara contra 4 ya que eso indica que se esta consumiendo actualmente el minuto numero 5
                    new Notification("Se acaba el tiempo", {
                      body: "Quedan 5 minutos de saldo en tu cuenta"
                    });
                  }
                  //Se agenda el temporizador para el siguiente ciclo en 60.000 ms (1 minuto)
                  this.timer = setTimeout(this.consume, 60000);
                }
              }
            );
          } else {
            //En caso de que la peticion se haya realizado correctamente se actualizan los valores
            this.saldo = response.saldo;
            this.restante = response.restante;
            if (this.restante === 4) {
              //Si al usuario le quedan 5 minutos de tiempo disponible se le notifica por medio de Notification de windows
              //(ACLARACION) se compara contra 4 ya que eso indica que se esta consumiendo actualmente el minuto numero 5
              new Notification("Se acaba el tiempo", {
                body: "Quedan 5 minutos en su cuenta"
              });
            }
            //Se agenda el temporizador para el siguiente ciclo en 60.000 ms (1 minuto)
            this.timer = setTimeout(this.consume, 60000);
            //Reiniciamos los segundos y agendamos el temporizador de segundos para dar la ilusion
            this.segundos = 59;
            this.timer_segundos = setTimeout(this.calcular_segundos, 1000);
          }
        }
      );
    },
    /**
     * Funcion que se encarga de simular la contabilizacion de los segundos
     */
    calcular_segundos: function () {
      if(this.segundos === 1){
        this.segundos = 0;
      }else{
        this.segundos -= 1;
        this.timer_segundos = setTimeout(this.calcular_segundos, 1000);
      }
    }
  }
};
</script>

<style>
</style>

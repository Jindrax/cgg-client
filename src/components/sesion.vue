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
import { clearInterval, setInterval, clearTimeout } from "timers";
export default {
  name: "Sesion",
  props: ["sesion", "socket", "username", "equipo"],
  data() {
    return {
      timer: null,
      saldo: 0,
      restante: 0
    };
  },
  computed: {
    tiempo_restante: function() {
      let tiempo = Duration.fromObject({ minutes: this.restante });
      return tiempo.toFormat("hh:mm");
    }
  },
  mounted() {
    if (this.sesion != 0) {
      this.consume();
    }
  },
  methods: {
    logout: function() {
      let sesion = {
        sesion: this.sesion
      };
      if (this.sesion == 0) {
        sesion.sesion = {
          username: this.username,
          equipo: this.equipo
        };
      }
      this.socket.post("/logout", sesion, (response, jwRes) => {
        if (jwRes.statusCode != 200) {
          this.$q.notify(response);
        } else {
          if (this.sesion != 0) {
            clearTimeout(this.timer);
          }
          this.$q.electron.ipcRenderer.send("log_out");
        }
      });
    },
    consume: function() {
      this.socket.post(
        "/consume",
        { sesion: this.sesion },
        (response, jwRes) => {
          if (jwRes.statusCode != 200) {
            this.socket.post(
              "/consume",
              {
                sesion: this.sesion
              },
              (response, jwRes) => {
                if (jwRes.statusCode != 200) {
                  this.$q.notify(response);
                  if (jwRes.statusCode == 402) {
                    let notification = new Notification("Sesion cerrada", {
                      body: "Te has quedado sin saldo en tu cuenta"
                    });
                  }
                  this.logout();
                } else {
                  this.saldo = response.saldo;
                  this.restante = response.restante;
                  if (this.restante == 4) {
                    let notification = new Notification("Se acaba el tiempo", {
                      body: "Quedan 5 minutos de saldo en tu cuenta"
                    });
                  }
                  this.timer = setTimeout(this.consume, 60000);
                }
              }
            );
          } else {
            this.saldo = response.saldo;
            this.restante = response.restante;
            if (this.restante == 4) {
              let notification = new Notification("Se acaba el tiempo", {
                body: "Quedan 5 minutos en su cuenta"
              });
            }
            this.timer = setTimeout(this.consume, 60000);
          }
        }
      );
    }
  }
};
</script>

<style>
</style>

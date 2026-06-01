import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, 
  IonButton, IonIcon, IonInput, IonAvatar 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, sparkles } from 'ionicons/icons';

// Estructura de datos para el chat
interface Mensaje {
  emisor: 'bot' | 'usuario';
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonFooter, IonButton, IonIcon, IonInput, IonAvatar
  ]
})
export class ChatbotPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  nuevoMensaje: string = '';
  escribiendo: boolean = false;

  mensajes: Mensaje[] = [
    {
      emisor: 'bot',
      texto: '¡Hola! Soy Mía, tu asistente virtual de Étnica Salón en Comas ✨. ¿En qué te puedo ayudar hoy? Puedes preguntarme por precios, horarios o consejos de belleza.',
      hora: this.obtenerHoraActual()
    }
  ];

  constructor() {
    addIcons({
      'send': send,
      'sparkles': sparkles
    });
  }

  ngOnInit() {}

  obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  enviarMensaje() {
    if (this.nuevoMensaje.trim() === '') return;

    // 1. Agregar el mensaje del usuario a la lista
    this.mensajes.push({
      emisor: 'usuario',
      texto: this.nuevoMensaje,
      hora: this.obtenerHoraActual()
    });

    const textoEnviado = this.nuevoMensaje;
    this.nuevoMensaje = '';
    this.hacerScrollAlFondo();

    // 2. Mostrar indicador de que el bot está "pensando"
    this.escribiendo = true;
    this.hacerScrollAlFondo();

    // 3. Simular la respuesta de n8n / Gemini (Aquí conectarás tu API real luego)
    setTimeout(() => {
      this.escribiendo = false;
      this.mensajes.push({
        emisor: 'bot',
        texto: `He recibido tu mensaje sobre "${textoEnviado}". Aún estoy en modo de prueba, pero pronto estaré conectada a la inteligencia artificial para responderte con exactitud.`,
        hora: this.obtenerHoraActual()
      });
      this.hacerScrollAlFondo();
    }, 1500);
  }

  hacerScrollAlFondo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}
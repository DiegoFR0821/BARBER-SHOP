import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonFooter, IonItem, IonInput, IonMenuButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, sparklesOutline } from 'ionicons/icons';
import { UsuarioService } from '../../services/usuario';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';

// 👇 1. Importamos el archivo de environments donde ahora vive tu API Key
import { environment } from 'src/environments/environment';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonMenuButton
  ]
})
export class ChatbotPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  nombreCliente: string = 'Cliente';
  mensajeTexto: string = '';
  mensajes: ChatMessage[] = [];
  escribiendo: boolean = false;

  // 🗑️ (ELIMINADO) La variable apiKey en texto plano ya no está aquí.
  private genAI: GoogleGenerativeAI;
  private chatSession!: ChatSession;

  // 🧠 EL CEREBRO DE MÍA (El contexto base que nunca olvidará)
  private contextoSistema = `
  Eres 'Mía', la asistente virtual exclusiva de 'Étnica Salón'. 
Tu tono es siempre amable, profesional, femenino y muy entusiasta sobre el cuidado de la belleza.

Información importante sobre el salón:
- Ubicación: Av. Micaela Bastidas N° 1045, Comas, Lima, Perú.
- Horarios: Lunes a Sábado de 9:00 AM a 8:00 PM. Descansan los domingos.
- Servicios principales: Cortes de cabello (S/30), Tintes y Balayage (desde S/120), Manicure Rusa (S/45), Peinados para eventos (S/80).

Secciones de nuestra Aplicación (Guía siempre al cliente a usarlas):
- RESERVAS: Si el cliente quiere agendar, indícale que puede hacerlo de forma rápida y automática en la sección "Reservar" de la aplicación.
- TIENDA: Si el cliente busca productos capilares o tratamientos, recuérdale que puede comprarlos directamente en la sección "Tienda".
- COMUNIDAD: Invita a los clientes a visitar la sección "Comunidad" para ver tips de belleza, fotos de nuestros trabajos y compartir experiencias con otras clientas.

Reglas y Restricciones:
- Objetivo: Resolver dudas de belleza, sugerir servicios y promover el uso de la App (Tienda, Reservas, Comunidad).
- Nunca inventes precios o servicios que no estén en la lista. 
- Si te preguntan algo fuera de la belleza o del salón, responde educadamente que solo puedes ayudar con temas del salón Étnica.
- ATENCIÓN HUMANA (IMPORTANTE): Si el usuario tiene una queja, un problema complejo, un error con la aplicación, o te hace una pregunta que no puedes resolver, discúlpate amablemente y pídele que se comunique con atención al cliente a través de nuestro WhatsApp oficial: 907456423.
- Sé concisa y directa en tus respuestas, usa emojis. No escribas párrafos gigantes porque el cliente te lee desde un celular.
  `;

  constructor(private usuarioService: UsuarioService) {
    addIcons({ send, 'sparkles-outline': sparklesOutline });
    // 👇 2. Inicializamos Gemini llamando a la variable de entorno
    this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
  }

  ngOnInit() {
    this.obtenerUsuario();
    this.iniciarChatIA();
  }

  obtenerUsuario() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (datosMemoria && datosMemoria.nombre) {
      this.nombreCliente = datosMemoria.nombre.split(' ')[0];
    }
  }

  async iniciarChatIA() {
    // Inicializamos el modelo Gemini 1.5 Flash (rápido y eficiente para chats)
    const model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' }); // Corregido a un modelo existente estándar
    
    // Configuramos el historial inicial. Le "inyectamos" el contexto simulando que el usuario lo preguntó primero y el modelo lo aceptó.
    this.chatSession = model.startChat({
      history: [
        { role: 'user', parts: [{ text: this.contextoSistema }] },
        { role: 'model', parts: [{ text: 'Entendido. Soy Mía, la asistente de Étnica Salón. Estoy lista para ayudar a los clientes con ese contexto en mente.' }] }
      ]
    });

    // Mensaje de bienvenida visible para el usuario
    this.mensajes.push({
      role: 'model',
      text: `¡Hola ${this.nombreCliente}! 👋 Soy Mía, tu estilista virtual de Étnica Salón. ¿En qué te puedo asesorar hoy? Pregúntame sobre tendencias, precios o consejos capilares.`
    });
  }

  async enviarMensaje() {
    const texto = this.mensajeTexto.trim();
    if (!texto) return;

    // 1. Mostrar el mensaje del usuario inmediatamente
    this.mensajes.push({ role: 'user', text: texto });
    this.mensajeTexto = '';
    this.hacerScrollAbajo();
    this.escribiendo = true;

    try {
      // 2. Enviar el mensaje a Gemini manteniendo el historial de la sesión
      const result = await this.chatSession.sendMessage(texto);
      const respuestaIA = result.response.text();

      // 3. Mostrar la respuesta de Mía
      this.mensajes.push({ role: 'model', text: respuestaIA });
    } catch (error) {
      console.error('Error con Gemini API:', error);
      this.mensajes.push({ role: 'model', text: 'Uy, lo siento. Mis conexiones neuronales de belleza están fallando un poquito ahora mismo. ¿Podrías repetirlo?' });
    } finally {
      this.escribiendo = false;
      this.hacerScrollAbajo();
    }
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}
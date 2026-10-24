import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, 
  IonIcon, IonFooter, IonItem, IonInput 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, sparklesOutline } from 'ionicons/icons';
import { UsuarioService } from '../../services/usuario';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
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
    IonButton, IonIcon, IonFooter, IonItem, IonInput
  ]
})
export class ChatbotPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  nombreCliente: string = 'Cliente';
  mensajeTexto: string = '';
  mensajes: ChatMessage[] = [];
  escribiendo: boolean = false;

  private genAI: GoogleGenerativeAI;
  private chatSession!: ChatSession;

  // CONTEXTO DE BARBER SHOP LIMA NORTE S.A.C.
  private contextoSistema = `
  Eres 'Blade', el asistente virtual experto en barbería y estética masculina de 'BARBER SHOP LIMA NORTE S.A.C.' (Comas, Lima, Perú).
  Tu tono es profesional, moderno, sobrio y masculino. Inspirado en 'The Barber Company'.
  
  Información importante de la barbería:
  - Razón Social: BARBER SHOP LIMA NORTE S.A.C. (RUC: 20611302151).
  - Ubicación: Av. Micaela Bastidas N° 1045, Comas, Lima Norte.
  - Horarios: Lunes a Sábado de 9:00 AM a 8:00 PM. Domingos cerrado por descanso dominical.
  - Servicios principales: 
    * Corte Clásico Ejecutivo (S/ 35.00 - 35 min)
    * Degradado Skin Fade Urbano (S/ 40.00 - 45 min)
    * Ritual de Barba Tradicional con toallas calientes y navaja (S/ 30.00 - 30 min)
    * Combo Master Barber: Fade + Barba (S/ 60.00 - 60 min)
    * Limpieza Facial Black Mask (S/ 45.00 - 30 min)
  
  Secciones de la App:
  - CITAS: Recomienda al cliente reservar en 3 pasos desde la pestaña Citas.
  - TIENDA: Productos de fijación (cera mate, pomada base agua), aceite de barba y shampoo mentolado.
  - PERFIL: El cliente puede registrar su estilo de corte, tipo de cabello y barba en su Ficha Técnica.
  
  Reglas:
  - Sé conciso, directo y usa emojis de barbería (💈, ✂️, 🪒).
  - Si el usuario tiene dudas complejas, indícale nuestro WhatsApp oficial: +51 929 727 435.
  `;

  constructor(private usuarioService: UsuarioService) {
    addIcons({ send, 'sparkles-outline': sparklesOutline });
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
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    this.chatSession = model.startChat({
      history: [
        { role: 'user', parts: [{ text: this.contextoSistema }] },
        { role: 'model', parts: [{ text: 'Entendido. Soy Blade, el asesor experto de Barber Shop Lima Norte. Listo para orientar a los clientes.' }] }
      ]
    });

    this.mensajes.push({
      role: 'model',
      text: `¡Hola ${this.nombreCliente}! 💈 Soy Blade, tu asesor en Barber Shop Lima Norte. ¿En qué estilo de corte, perfilado de barba o tratamiento te puedo orientar hoy?`
    });
  }

  async enviarMensaje() {
    const texto = this.mensajeTexto.trim();
    if (!texto) return;

    this.mensajes.push({ role: 'user', text: texto });
    this.mensajeTexto = '';
    this.hacerScrollAbajo();
    this.escribiendo = true;

    try {
      const result = await this.chatSession.sendMessage(texto);
      const respuestaIA = result.response.text();
      this.mensajes.push({ role: 'model', text: respuestaIA });
    } catch (error) {
      console.error('Error con Gemini API:', error);
      this.mensajes.push({ 
        role: 'model', 
        text: 'Disculpa, hubo una intermitencia de red. Recuerda que puedes consultar disponibilidad directa en la sección Citas o por WhatsApp al +51 929 727 435.' 
      });
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

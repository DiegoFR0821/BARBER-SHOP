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

  private genAI?: GoogleGenerativeAI;
  private chatSession?: ChatSession;

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
    try {
      if (environment.geminiApiKey) {
        this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
      }
    } catch (e) {
      console.warn('Inicializando modo experto local para Blade:', e);
    }
  }

  ngOnInit() {
    this.obtenerUsuario();
    this.iniciarChatIA();
  }

  ionViewWillEnter() {
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (datosMemoria && datosMemoria.nombre) {
      this.nombreCliente = datosMemoria.nombre.split(' ')[0];
    }
  }

  async iniciarChatIA() {
    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: this.contextoSistema }] },
            { role: 'model', parts: [{ text: 'Entendido. Soy Blade, el asesor experto de Barber Shop Lima Norte. Listo para orientar a los clientes.' }] }
          ]
        });
      }
    } catch (e) {
      console.warn('Sesión IA usando motor local Blade:', e);
    }

    if (this.mensajes.length === 0) {
      this.mensajes.push({
        role: 'model',
        text: `¡Hola ${this.nombreCliente}! 💈 Soy Blade, tu asesor experto en Barber Shop Lima Norte. ¿En qué estilo de corte, degradado, perfilado de barba o producto te puedo orientar hoy?`
      });
    }
  }

  async enviarMensaje() {
    const texto = this.mensajeTexto.trim();
    if (!texto) return;

    this.mensajes.push({ role: 'user', text: texto });
    this.mensajeTexto = '';
    this.hacerScrollAbajo();
    this.escribiendo = true;

    try {
      if (!this.chatSession) {
        throw new Error('Usar motor local');
      }
      const result = await this.chatSession.sendMessage(texto);
      const respuestaIA = result.response.text();
      this.mensajes.push({ role: 'model', text: respuestaIA });
    } catch {
      // Motor local inteligente "Blade" para responder de forma experta sin mostrar errores de red
      await new Promise(resolve => setTimeout(resolve, 450));
      const respuestaExperta = this.generarRespuestaExpertaLocal(texto);
      this.mensajes.push({ 
        role: 'model', 
        text: respuestaExperta 
      });
    } finally {
      this.escribiendo = false;
      this.hacerScrollAbajo();
    }
  }

  /**
   * Motor de respuesta local inteligente (Asesor Experto "Blade")
   * Responde preguntas sobre cortes (Skin Fade, Taper Fade, Clásico, Pompadour), barba, precios, productos y horarios.
   */
  private generarRespuestaExpertaLocal(consulta: string): string {
    const q = consulta.toLowerCase();

    if (q.includes('precio') || q.includes('costo') || q.includes('cuanto') || q.includes('cuánto') || q.includes('tarifa') || q.includes('servicio')) {
      return `💈 En **Barber Shop Lima Norte** manejamos estas tarifas oficiales:\n• **Corte Clásico Ejecutivo:** S/ 35.00 (35 min)\n• **Degradado Skin Fade Urbano:** S/ 40.00 (45 min)\n• **Ritual de Barba Tradicional (Toalla Caliente):** S/ 30.00 (30 min)\n• **Combo Master Barber (Fade + Barba):** S/ 60.00 (60 min)\n• **Limpieza Facial Black Mask:** S/ 45.00 (30 min)\n\nPuedes agendar cualquiera en 3 pasos desde la pestaña **Citas** ✂️.`;
    }

    if (q.includes('fade') || q.includes('degradado') || q.includes('skin') || q.includes('taper')) {
      return `✂️ ¡Excelente elección! Te explico la diferencia para tu estilo:\n• **Skin Fade (S/ 40):** Desvanecido al ras o a navaja desde la base, ideal si buscas un look urbano de alto contraste. Te recomiendo a **Carlos "Blade" Mendoza**.\n• **Taper Fade:** Solo desvanece patillas y nuca conservando los laterales más naturales.\n• **Fade Clásico:** Degradado medio versátil para oficina o diario.\n\nGuarda tu favorito en **Mi Perfil** para que tu barbero lo tenga listo 💈.`;
    }

    if (q.includes('corte') || q.includes('cabello') || q.includes('pelo') || q.includes('pompadour') || q.includes('clasico') || q.includes('clásico') || q.includes('rostro') || q.includes('cara') || q.includes('recomienda')) {
      return `💈 Según el tipo de rostro y cabello, te sugiero:\n• **Rostro redondo o cuadrado:** Un **Skin Fade con volumen arriba (Pompadour o Quiff)** estiliza las facciones.\n• **Cabello lacio o ejecutivo:** El **Corte Clásico a Tijera (S/ 35)** con **Cera Mate** da textura limpia sin brillo.\n• **Cabello ondulado/grueso:** Un **Taper Fade** con **Pomada Base Agua** controla el volumen todo el día. ✂️`;
    }

    if (q.includes('barba') || q.includes('afeitado') || q.includes('navaja') || q.includes('toalla') || q.includes('bigote')) {
      return `🪒 Nuestro **Ritual de Barba Tradicional (S/ 30.00)** incluye vapor de ozono, toallas calientes aromáticas, perfilado milimétrico a navaja y bálsamo after-shave. Nuestro especialista **Mateo Quispe** es experto en visagismo de barba.\n\nPara el cuidado diario en casa, tenemos en la **Tienda** el *Aceite Premium con Argán y Jojoba (S/ 40)* y el *Bálsamo Calmante (S/ 35)*.`;
    }

    if (q.includes('producto') || q.includes('cera') || q.includes('pomada') || q.includes('aceite') || q.includes('shampoo') || q.includes('tienda') || q.includes('comprar')) {
      return `🛍️ En nuestra sección **Tienda** encuentras productos exclusivos para hombre:\n• **Cera Mate Fijación Fuerte (100g):** S/ 45.00 (acabado natural sin brillo).\n• **Pomada Base Agua (120g):** S/ 42.00 (fijación clásica, sale con agua).\n• **Aceite Premium para Barba (30ml):** S/ 40.00.\n• **Shampoo Fortalecedor & Menta (250ml):** S/ 48.00.\n• **Bálsamo After-Shave (100ml):** S/ 35.00.\n\nPuedes añadirlos a tu carrito y pagar con Yape o Tarjeta.`;
    }

    if (q.includes('horario') || q.includes('hora') || q.includes('abierto') || q.includes('atencion') || q.includes('atención') || q.includes('ubicacion') || q.includes('ubicación') || q.includes('donde') || q.includes('dónde') || q.includes('direccion') || q.includes('dirección')) {
      return `📍 Estamos ubicados en **Av. Micaela Bastidas N° 1045, Comas (Lima Norte)**.\n⏰ **Horario de atención:** Lunes a Sábado de **9:00 AM a 8:00 PM**.\n📱 WhatsApp directo: **+51 929 727 435**.\n\n¡Te esperamos para tu próximo corte! 💈`;
    }

    if (q.includes('cita') || q.includes('reserva') || q.includes('agendar') || q.includes('turno') || q.includes('barbero')) {
      return `📅 Reservar tu turno en **Barber Shop** toma menos de 30 segundos en la pestaña **Citas**:\n1️⃣ Elige tu servicio (Corte, Barba, Facial o Combo) y tu barbero (**Carlos Mendoza**, **Mateo Quispe** o **Leonardo Valdivia**).\n2️⃣ Selecciona la fecha y hora disponible en tiempo real.\n3️⃣ Confirma adjuntando tu ficha técnica de corte. 💈`;
    }

    if (q.includes('facial') || q.includes('black mask') || q.includes('mascarilla') || q.includes('piel')) {
      return `✨ Nuestra **Limpieza Facial Black Mask (S/ 45.00 - 30 min)** realiza una exfoliación profunda, apertura de poros con vapor, extracción de impurezas con carbón activado e hidratación matificante. Es el complemento perfecto después de un corte Fade 💈.`;
    }

    if (q.includes('hola') || q.includes('buenas') || q.includes('buenos') || q.includes('que tal') || q.includes('qué tal')) {
      return `¡Hola ${this.nombreCliente}! 💈 Qué gusto saludarte en **Barber Shop Lima Norte**. Puedo asesorarte sobre estilos de corte (**Skin Fade, Taper, Pompadour, Ejecutivo**), cuidado de **barba**, **precios** o productos de nuestra **Tienda**. ¿Qué estilo tienes en mente hoy? ✂️`;
    }

    return `💈 Como barbero asesor de **Barber Shop Lima Norte**, te recomiendo nuestro **Combo Master Barber (Corte Fade + Ritual de Barba por S/ 60.00)** o el **Degradado Skin Fade Urbano (S/ 40.00)**.\n\n¿Te gustaría conocer qué tipo de degradado va mejor con tu cabello, consultar precios de la **Tienda** o agendar una cita en la pestaña **Citas**? ✂️🪒`;
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}

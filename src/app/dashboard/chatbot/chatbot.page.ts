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

  /**
   * SYSTEM INSTRUCTION FIJO PARA GOOGLE GEMINI (BARBER SHOP LIMA NORTE S.A.C.)
   */
  public readonly systemInstruction: string = `
Eres 'Blade', el asesor virtual experto en barbería, visagismo y cuidado masculino de 'Barber Shop Lima Norte S.A.C.' (RUC: 20611302151), ubicado en Av. Micaela Bastidas N° 1045, Comas, Lima Norte.

DATOS OFICIALES DEL NEGOCIO:
1. Nombre del negocio: Barber Shop Lima Norte S.A.C.
2. Personal / Staff Oficial de Barberos:
   - Carlos "Blade" Mendoza (Master Barber): Especialista en degradados urbanos Skin Fade, Taper Fade y cortes de alta precisión.
   - Mateo Quispe (Especialista en Barba): Experto en perfilado con navaja libre, visagismo de barba y ritual de toallas calientes con ozono.
   - Leonardo Valdivia (Estilista Masculino): Especialista en Corte Clásico Ejecutivo a tijera, Pompadour, Quiff y tratamientos faciales masculinos.
3. Servicios Principales y Tarifas Oficiales:
   - Corte Clásico Ejecutivo: S/ 35 (35 min)
   - Degradado Skin Fade Urbano: S/ 40 (45 min)
   - Ritual de Barba Tradicional: S/ 30 (30 min)
   - Combo Master (Corte Fade + Ritual de Barba): S/ 60 (60 min)
   - Limpieza Facial (Black Mask & Vapor de Ozono): S/ 45 (30 min)
4. Horarios de Atención y Propósito:
   - Horario: Lunes a Sábado de 9:00 AM a 8:00 PM (Domingos cerrado).
   - WhatsApp de atención: +51 929 727 435.
   - Propósito: Brindar asesoría experta en cortes, degradados, tipos de rostro y cuidado de barba de forma amable, urbana, masculina y profesional. Guiar al cliente para agendar su cita en 3 pasos desde la pestaña 'Citas' o adquirir productos en 'Tienda'.
`.trim();

  constructor(private usuarioService: UsuarioService) {
    addIcons({ send, 'sparkles-outline': sparklesOutline });
    try {
      const apiKey = (environment.geminiApiKey || '').trim();
      const esPlaceholder = !apiKey || apiKey.includes('TU_') || apiKey.includes('AQUÍ_VA');
      if (!esPlaceholder) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      }
    } catch (e) {
      console.warn('Inicializando respaldo inteligente local "Blade":', e);
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
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: this.systemInstruction
        });
        this.chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: this.systemInstruction }] },
            {
              role: 'model',
              parts: [{
                text: 'Entendido. Soy Blade, asesor experto de Barber Shop Lima Norte S.A.C. Conozco a nuestro equipo (Carlos "Blade" Mendoza, Mateo Quispe y Leonardo Valdivia) y nuestros servicios oficiales. Listo para asesorar a los clientes.'
              }]
            }
          ]
        });
      }
    } catch (e) {
      console.warn('Sesión IA usando respaldo inteligente local Blade:', e);
    }

    if (this.mensajes.length === 0) {
      this.mensajes.push({
        role: 'model',
        text: `¡Hola ${this.nombreCliente}! 💈 Soy Blade, tu asesor experto en Barber Shop Lima Norte S.A.C. ¿En qué estilo de corte, degradado, ritual de barba o barbero de nuestro staff te puedo orientar hoy?`
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
        throw new Error('Activar respaldo local Blade');
      }
      const result = await this.chatSession.sendMessage(texto);
      const respuestaIA = result.response.text();
      this.mensajes.push({ role: 'model', text: respuestaIA });
    } catch {
      // Respaldo inteligente local ("Blade") si la API de Gemini falla o no tiene API Key activa
      await new Promise(resolve => setTimeout(resolve, 420));
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
   * Respaldo inteligente local ("Blade") con respuestas predefinidas sobre
   * Barber Shop Lima Norte S.A.C., su personal (Carlos Mendoza, Mateo Quispe, Leonardo Valdivia),
   * servicios oficiales, precios y horarios.
   */
  private generarRespuestaExpertaLocal(consulta: string): string {
    const q = consulta.toLowerCase();

    if (q.includes('barbero') || q.includes('personal') || q.includes('staff') || q.includes('equipo') || q.includes('carlos') || q.includes('mateo') || q.includes('leonardo') || q.includes('quien') || q.includes('quién')) {
      return `💈 En **Barber Shop Lima Norte S.A.C.** contamos con 3 especialistas de primer nivel:\n• **Carlos "Blade" Mendoza (Master Barber):** Experto en Degradado Skin Fade Urbano y cortes de alta precisión.\n• **Mateo Quispe (Especialista en Barba):** Maestro en Ritual de Barba Tradicional con toallas calientes y navaja.\n• **Leonardo Valdivia (Estilista Masculino):** Especialista en Corte Clásico Ejecutivo a tijera, Pompadour y Limpieza Facial.\n\nPuedes elegir a tu favorito al reservar en la pestaña **Citas** ✂️.`;
    }

    if (q.includes('precio') || q.includes('costo') || q.includes('cuanto') || q.includes('cuánto') || q.includes('tarifa') || q.includes('servicio') || q.includes('catalogo') || q.includes('catálogo')) {
      return `💈 Estos son los servicios principales de **Barber Shop Lima Norte S.A.C.**:\n• **Corte Clásico Ejecutivo:** S/ 35 (35 min)\n• **Degradado Skin Fade Urbano:** S/ 40 (45 min)\n• **Ritual de Barba Tradicional:** S/ 30 (30 min)\n• **Combo Master (Corte + Barba):** S/ 60 (60 min)\n• **Limpieza Facial:** S/ 45 (30 min)\n\nAgenda tu turno en 3 pasos desde la pestaña **Citas** ✂️.`;
    }

    if (q.includes('combo') || q.includes('master')) {
      return `🔥 El **Combo Master (S/ 60 - 60 min)** es nuestra experiencia estrella en **Barber Shop Lima Norte S.A.C.**: incluye un corte personalizado (**Skin Fade Urbano** o **Clásico Ejecutivo**) más el **Ritual de Barba Tradicional** con toalla caliente, vapor de ozono y perfilado a navaja. ¡Te recomendamos agendarlo con **Carlos "Blade" Mendoza** o **Mateo Quispe**! 💈`;
    }

    if (q.includes('fade') || q.includes('degradado') || q.includes('skin') || q.includes('taper')) {
      return `✂️ Para un degradado impecable tenemos el **Degradado Skin Fade Urbano (S/ 40 - 45 min)** a cargo de nuestro Master Barber **Carlos "Blade" Mendoza**:\n• **Skin Fade:** Desvanecido al ras o a navaja desde la base para un look urbano de alto contraste.\n• **Taper Fade:** Degradado limpio en patillas y nuca.\n• **Fade Clásico:** Degradado medio versátil.\n\nPuedes guardar tu preferencia en **Mi Perfil** 💈.`;
    }

    if (q.includes('corte') || q.includes('cabello') || q.includes('pelo') || q.includes('pompadour') || q.includes('clasico') || q.includes('clásico') || q.includes('ejecutivo') || q.includes('rostro') || q.includes('recomienda')) {
      return `💈 Según tu estilo y tipo de rostro te asesoro:\n• **Corte Clásico Ejecutivo (S/ 35):** Ideal para cabello lacio u ondulado con acabado limpio a tijera (especialidad de **Leonardo Valdivia**).\n• **Degradado Skin Fade Urbano (S/ 40):** Estiliza rostros redondos o cuadrados dando estructura en los laterales (especialidad de **Carlos "Blade" Mendoza**).\n• **Combo Master (S/ 60):** Corte completo + diseño de barba. ✂️`;
    }

    if (q.includes('barba') || q.includes('afeitado') || q.includes('navaja') || q.includes('toalla') || q.includes('bigote')) {
      return `🪒 Nuestro **Ritual de Barba Tradicional (S/ 30 - 30 min)** es realizado por **Mateo Quispe (Especialista en Barba)**. Incluye vapor de ozono, toallas calientes aromáticas, perfilado milimétrico a navaja y bálsamo after-shave.\n\nTambién puedes elegir el **Combo Master (S/ 60)** que une Corte Fade + Ritual de Barba 💈.`;
    }

    if (q.includes('facial') || q.includes('black mask') || q.includes('mascarilla') || q.includes('piel') || q.includes('limpieza')) {
      return `✨ Nuestra **Limpieza Facial (S/ 45 - 30 min)** a cargo de **Leonardo Valdivia (Estilista Masculino)** incluye exfoliación profunda, vapor de ozono, mascarilla negra de carbón activado (Black Mask) e hidratación matificante. ¡Ideal para renovar el rostro después de tu corte! 💈`;
    }

    if (q.includes('horario') || q.includes('hora') || q.includes('abierto') || q.includes('atencion') || q.includes('atención') || q.includes('ubicacion') || q.includes('ubicación') || q.includes('donde') || q.includes('dónde') || q.includes('direccion') || q.includes('dirección')) {
      return `📍 **Barber Shop Lima Norte S.A.C.** está en **Av. Micaela Bastidas N° 1045, Comas, Lima Norte**.\n⏰ **Horario:** Lunes a Sábado de **9:00 AM a 8:00 PM** (Domingos cerrado).\n📱 WhatsApp: **+51 929 727 435**.\n\n¡Te esperamos para tu próximo corte! 💈`;
    }

    if (q.includes('producto') || q.includes('cera') || q.includes('pomada') || q.includes('aceite') || q.includes('shampoo') || q.includes('tienda') || q.includes('comprar')) {
      return `🛍️ En nuestra **Tienda** disponemos de productos profesionales masculinos:\n• **Cera Mate Fijación Fuerte:** S/ 45\n• **Pomada Base Agua:** S/ 42\n• **Aceite Premium para Barba:** S/ 40\n• **Shampoo Fortalecedor & Menta:** S/ 48\n• **Bálsamo After-Shave:** S/ 35\n\nAñádelos al carrito y paga con Yape/Plin o Tarjeta 💈.`;
    }

    if (q.includes('hola') || q.includes('buenas') || q.includes('buenos') || q.includes('que tal') || q.includes('qué tal')) {
      return `¡Hola ${this.nombreCliente}! 💈 Bienvenido a **Barber Shop Lima Norte S.A.C.** Soy **Blade**, tu asesor experto. Nuestro equipo (**Carlos "Blade" Mendoza**, **Mateo Quispe** y **Leonardo Valdivia**) está listo para atenderte en **Corte Clásico (S/ 35)**, **Skin Fade Urbano (S/ 40)**, **Ritual de Barba (S/ 30)**, **Combo Master (S/ 60)** o **Limpieza Facial (S/ 45)**. ¿Qué estilo buscas hoy? ✂️`;
    }

    return `💈 En **Barber Shop Lima Norte S.A.C.** te asesoramos con nuestro staff experto:\n• **Carlos "Blade" Mendoza** (Master Barber — *Degradado Skin Fade Urbano S/ 40*)\n• **Mateo Quispe** (Especialista en Barba — *Ritual de Barba Tradicional S/ 30*)\n• **Leonardo Valdivia** (Estilista Masculino — *Corte Clásico Ejecutivo S/ 35* y *Limpieza Facial S/ 45*)\n• **Combo Master (Corte + Barba):** S/ 60\n\n¿Sobre cuál servicio o estilo te gustaría recibir recomendación? ✂️🪒`;
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}

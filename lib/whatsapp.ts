const WHATSAPP_VERSION = 'v23.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// WhatsApp template component types
interface TextParameter {
  type: 'text';
  text: string;
  /** Parameter name for named parameters (e.g., 'invitee', 'date') */
  parameter_name: string;
}

interface ImageParameter {
  type: 'image';
  image: { link: string };
}

interface DocumentParameter {
  type: 'document';
  document: { link: string; filename?: string };
}

export type MediaType = 'image' | 'document';

type TemplateParameter = TextParameter | ImageParameter | DocumentParameter;

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: string;
  parameters: TemplateParameter[] | { type: 'text'; text: string }[];
}

interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

interface SendTemplateResult {
  success: boolean;
  messageId?: string;
  error?: unknown;
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = 'en',
  components = []
}: SendTemplateParams): Promise<SendTemplateResult> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
    console.error('WhatsApp API credentials missing');
    return { success: false, error: 'Credentials missing' };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components
    }
  };

  console.dir(body, { depth: null })
  console.log('url', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { success: false, error: data };
    }

    // Extract message ID from response
    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    console.error('WhatsApp Request Failed:', error);
    return { success: false, error };
  }
}

/**
 * Sends a simple text message via WhatsApp
 */
export async function sendWhatsAppText(to: string, text: string): Promise<SendTemplateResult> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
    console.error('WhatsApp API credentials missing');
    return { success: false, error: 'Credentials missing' };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { success: false, error: data };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    console.error('WhatsApp Text Request Failed:', error);
    return { success: false, error };
  }
}

/**
 * Sends an image message via WhatsApp
 */
export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<SendTemplateResult> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
    console.error('WhatsApp API credentials missing');
    return { success: false, error: 'Credentials missing' };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption ? { caption } : {})
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { success: false, error: data };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    console.error('WhatsApp Image Request Failed:', error);
    return { success: false, error };
  }
}

/**
 * Template name mapping based on locale, media type, and QR requirement
 */
export function getInviteTemplateName(locale: string, qrEnabled: boolean, mediaType?: MediaType): string {
  const typePrefix = mediaType === 'image' ? 'invite_img' : 'invite_doc';
  const qrSuffix = qrEnabled ? '_qr' : '';
  const langSuffix = locale === 'ar' ? '_ar' : '_en';
  
  return `${typePrefix}${qrSuffix}${langSuffix}`;
}


interface SendInviteTemplateParams {
  to: string;
  locale: 'en' | 'ar';
  qrEnabled: boolean;
  invitee: string;
  greetingText: string;
  date: string;
  time: string;
  locationName: string;
  /** Location coordinates or Google Maps URL for the CTA button */
  location?: string;
  /** Public URL of the media (image or PDF) */
  mediaUrl?: string;
  /** Type of media: 'image' or 'document' (PDF) */
  mediaType?: MediaType;
  /** Filename to display for documents (optional) */
  mediaFilename?: string;
}

/**
 * Sends an invitation using the appropriate template based on locale and QR requirement.
 * Templates: invite_doc_en, invite_doc_ar, invite_doc_qr_en, invite_doc_qr_ar
 * 
 * Named parameters (must match your Meta template exactly):
 * - {{invitee}} - Guest name
 * - {{greeting_text}} - Custom greeting message
 * - {{date}} - Event date
 * - {{time}} - Event time  
 * - {{location_name}} - Location/venue name
 * 
 * Header: Optional image or document
 */
export async function sendInviteTemplate({
  to,
  locale,
  qrEnabled,
  invitee,
  greetingText,
  date,
  time,
  locationName,
  location,
  mediaUrl,
  mediaType,
  mediaFilename
}: SendInviteTemplateParams): Promise<SendTemplateResult> {
  const templateName = getInviteTemplateName(locale, qrEnabled, mediaType);
  
  const components: TemplateComponent[] = [];

  // Add header component if media is provided
  if (mediaUrl && mediaType) {
    // If the template name contains '_doc_', it expects a DOCUMENT header,
    // even if the file is an image.
    const isDocTemplate = templateName.includes('_doc_');
    
    if (mediaType === 'image' && !isDocTemplate) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: mediaUrl }
          }
        ]
      });
    } else {
      // Send as document for doc templates or if mediaType is document
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: { 
              link: mediaUrl,
              filename: mediaFilename || (mediaType === 'image' ? 'invitation.png' : 'invitation.pdf')
            }
          }
        ]
      });
    }
  }

  // Add body component with named text parameters
  // Parameter names must match exactly what's defined in your Meta template
  components.push({
    type: 'body',
    parameters: [
      { type: 'text', text: invitee, parameter_name: 'invitee' },
      { type: 'text', text: greetingText, parameter_name: 'greeting_text' },
      { type: 'text', text: date, parameter_name: 'date' },
      { type: 'text', text: time, parameter_name: 'time' },
      { type: 'text', text: locationName, parameter_name: 'location_name' }
    ]
  });

  // Add button component with location coordinates for the CTA URL
  // The template has a URL button with a dynamic query parameter {{1}}
  // Extract just the coordinates if a full Google Maps URL is provided
  if (location) {
    let coords = location;
    
    // If it's a Google Maps URL, extract the coordinates from the query parameter
    if (location.startsWith('http')) {
      try {
        const url = new URL(location);
        // Handle ?q=lat,lng format
        const q = url.searchParams.get('q');
        if (q) {
          coords = q;
        }
      } catch {
        // If URL parsing fails, use the original value
      }
    }
    
    // URL-encode the coordinates to handle special characters like commas
    const encodedCoords = encodeURIComponent(coords);
    
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '2',
      parameters: [
        { type: 'text', text: encodedCoords }
      ]
    });
  }

  return sendWhatsAppTemplate({
    to,
    templateName,
    languageCode: locale,
    components
  });
}

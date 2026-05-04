import { TEMPLATE_OVERRIDES } from "./templates/templates";

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

/**
 * Build the exact JSON body that WhatsApp Cloud API expects for POST /messages.
 * The worker will send this payload "as is".
 */
export function buildWhatsAppTemplatePayload({
  to,
  templateName,
  languageCode = "en",
  components = [],
}: SendTemplateParams) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  } as const;
}

export function buildWhatsAppTextPayload(to: string, text: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  } as const;
}

export function buildWhatsAppImagePayload(to: string, imageUrl: string, caption?: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: {
      link: imageUrl,
      ...(caption ? { caption } : {}),
    },
  } as const;
}

/**
 * Template name mapping based on locale, media type, QR requirement, and guests requirement
 */
export function getInviteTemplateName(locale: string, qrEnabled: boolean, mediaType: MediaType,
    guestsEnabled: boolean,
): string {
  const typePrefix = mediaType === 'image' ? 'invite_img' : 'invite_doc';
  const qrSuffix = qrEnabled ? '_qr' : '';
  const guestsSuffix = guestsEnabled ? '_guests' : '';
  const langSuffix = locale === 'ar' ? '_ar' : '_en';
  
  const templateName = `${typePrefix}${qrSuffix}${guestsSuffix}${langSuffix}`;
  return templateName;
}


interface SendInviteTemplateParams {
  to: string;
  locale: 'en' | 'ar';
  qrEnabled: boolean;
  guestsEnabled: boolean;
  inviteCount?: number;
  invitee: string;
  greetingText: string;
  date: string;
  time: string;
  locationName: string;
  /** Location coordinates or Google Maps URL for the CTA button */
  location: string;
  /** Public URL of the media (image or PDF) */
  mediaUrl: string;
  /** Type of media: 'image' or 'document' (PDF) */
  mediaType: MediaType;
  /** Filename to display for documents (optional) */
  mediaFilename?: string;
}

export function buildInviteTemplatePayload({
  to,
  locale,
  qrEnabled,
  guestsEnabled,
  inviteCount,
  invitee,
  greetingText,
  date,
  time,
  locationName,
  location,
  mediaUrl,
  mediaType,
  mediaFilename,
}: SendInviteTemplateParams) {
  const templateName = getInviteTemplateName(locale, qrEnabled, mediaType, guestsEnabled);
  
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
  const bodyParameters: TextParameter[] = [
    { type: 'text', text: invitee, parameter_name: 'invitee' },
    { type: 'text', text: greetingText, parameter_name: 'greeting_text' },
    { type: 'text', text: date, parameter_name: 'date' },
    { type: 'text', text: time, parameter_name: 'time' },
    { type: 'text', text: locationName, parameter_name: 'location_name' }
  ];

  // Add invite_count parameter if guests are enabled
  if (guestsEnabled) {
    const count = inviteCount || 2;
    bodyParameters.push({ type: 'text', text: String(count), parameter_name: 'invite_count' });
  }

  components.push({
    type: 'body',
    parameters: bodyParameters
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

  // account for overrides for names in WABA that dont match the naming pattern
  const template = TEMPLATE_OVERRIDES[templateName] ?? templateName;

  return buildWhatsAppTemplatePayload({
    to,
    templateName: template,
    languageCode: locale,
    components,
  });
}

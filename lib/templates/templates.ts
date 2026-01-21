/* eslint-disable @typescript-eslint/no-explicit-any */
import { dedent } from "../utils/string";

// TODO: add template override names for templates with odd naming patterns

// string to function mapping
export const TEMPLATES = {
    "invite_doc_qr_en": (params: any) => {
        return dedent`
            Hi ${params.invitee},

            ${params.greeting_text}

            📅 Date: ${params.date}
            ⏱️ Time: ${params.time}
            📍 Location: ${params.location_name}

            Kindly confirm or decline your attendance. Once confirmed, you'll receive a QR code to scan upon arrival.
        `;
    },
    // same as above
    "invite_img_qr_en": (params: any) => {
        return TEMPLATES.invite_doc_qr_en(params);
    },
    "invite_doc_en": (params: any) => {
        return dedent`
            Hi ${params.invitee},

            ${params.greeting_text}

            📅 Date: ${params.date}
            ⏱️ Time: ${params.time}
            📍 Location: ${params.location_name}

            Kindly confirm or decline your attendance.
        `;
    },
    // same as above
    "invite_img_en": (params: any) => {
        return TEMPLATES.invite_doc_en(params);
    },

    "invite_doc_qr_ar": (params: any) => {
        return dedent`
            مرحبا ${params.invitee}،

            ${params.greeting_text}

            📅 التاريخ: ${params.date}
            ⏱️ الوقت: ${params.time}
            📍 الموقع: ${params.location_name}

            يرجى تأكيد الحضور أو الاعتذار. بعد تأكيد الحضور، سوف يتم إرسال رمز ال QR لاستخدامه عند الدخول.
        `;
    },
    // same as above
    "invite_img_qr_ar": (params: any) => {
        return TEMPLATES.invite_doc_qr_ar(params);
    },
    "invite_doc_ar": (params: any) => {
        return dedent`
            مرحبا ${params.invitee}،

            ${params.greeting_text}

            📅 التاريخ: ${params.date}
            ⏱️ الوقت: ${params.time}
            📍 الموقع: ${params.location_name}

            يرجى تأكيد الحضور أو الاعتذار.
        `;
    },
    "invite_img_ar": (params: any) => {
        return TEMPLATES.invite_doc_ar(params);
    }
};
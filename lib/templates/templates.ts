/* eslint-disable @typescript-eslint/no-explicit-any */
import { dedent } from "../utils/string";

export const TEMPLATE_OVERRIDES: Record<string, string> = {
    "invite_img_qr_ar": "invite_img_qr_ar_2",
    "invite_doc_qr_ar": "invite_doc_qr_ar_2",
};

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
    },
    "invite_img_qr_guests_en": (params: any) => {
        return dedent`
        Hi ${params.invitee},

        ${params.greeting_text}

        📅 Date: ${params.date}
        ⏱️ Time: ${params.time}
        📍 Location: ${params.location_name}

        Notes:
        - You have ${params.invite_count} invitation(s) allocated to you.

        Kindly confirm or decline your attendance. Once confirmed, you'll receive a QR code to scan upon arrival.
        `;
    },
    "invite_doc_qr_guests_en": (params: any) => {
        return TEMPLATES.invite_img_qr_guests_en(params);
    },
    "invite_doc_guests_en": (params: any) => {
        return dedent`
        Hi ${params.invitee},

        ${params.greeting_text}

        📅 Date: ${params.date}
        ⏱️ Time: ${params.time}
        📍 Location: ${params.location_name}

        Notes:
        - You have ${params.invite_count} invitation(s) allocated to you.

        Kindly confirm or decline your attendance.`
    },
    "invite_img_guests_en": (params: any) => {
        return TEMPLATES.invite_doc_guests_en(params);
    },
    "invite_img_qr_guests_ar": (params: any) => {
        return dedent`
        مرحبا ${params.invitee}،

        ${params.greeting_text}

        📅 التاريخ: ${params.date}
        ⏱️ الوقت: ${params.time}
        📍 الموقع: ${params.location_name}

        ملاحظات:  
        • الدعوات المخصصة لكم هي ${params.invite_count} دعوة شخصية

        يرجى تأكيد الحضور أو الاعتذار. بعد تأكيد الحضور، سوف يتم إرسال رمز ال QR لاستخدامه عند الدخول.`;
    },
    "invite_doc_qr_guests_ar": (params: any) => {
        return TEMPLATES.invite_img_qr_guests_ar(params);
    },
    "invite_img_guests_ar": (params: any) => {
        return dedent`
        مرحبا ${params.invitee}،

        ${params.greeting_text}

        📅 التاريخ: ${params.date}
        ⏱️ الوقت: ${params.time}
        📍 الموقع: ${params.location_name}

        ملاحظات:  
        • الدعوات المخصصة لكم هي ${params.invite_count} دعوة شخصية

        يرجى تأكيد الحضور أو الاعتذار.`;
    },
    "invite_doc_guests_ar": (params: any) => {
        return TEMPLATES.invite_img_guests_ar(params);
    },
};
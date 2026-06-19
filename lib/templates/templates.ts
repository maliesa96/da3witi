/* eslint-disable @typescript-eslint/no-explicit-any */
import { dedent } from "../utils/string";

const VENDOR_TEMPLATE_OVERRIDES: Record<string, Record<string, string>> = {
    // Default (primary site) overrides
    default: {
        "invite_img_qr_ar": "invite_img_qr_ar_2",
        "invite_doc_qr_ar": "invite_doc_qr_ar_2",
    },
    // Caba vendor
    "f3b1c291-ca9b-4c7b-a4fa-9e840181a74f": {
        "invite_img_qr_ar": "invite_img_qr_ar_2_2",
        "invite_doc_qr_ar": "invite_doc_qr_ar_2_2",
        "invite_doc_guests_ar": "invite_doc_guests_ar_2",
        "invite_img_guests_ar": "invite_img_guests_ar_2",
        "invite_doc_qr_guests_ar": "invite_doc_qr_guests_ar_2",
        "invite_img_qr_guests_ar": "invite_img_qr_guests_ar_2",
        "invite_doc_guests_en": "invite_doc_guests_en_2",
        "invite_img_guests_en": "invite_img_guests_en_2",
        "invite_doc_qr_guests_en": "invite_doc_qr_guests_en_2",
        "invite_img_qr_guests_en": "invite_img_qr_guests_en_2",
        "invite_img_ar": "invite_img_ar_2",
        "invite_img_en": "invite_img_en_2",
        "invite_img_qr_en": "invite_img_qr_en_2",
        "invite_doc_ar": "invite_doc_ar_2",
        "invite_doc_en": "invite_doc_en_2",
        "invite_doc_qr_en": "invite_doc_qr_en_2",
    },
};

const vendorId = process.env.VENDOR_ID || "default";
export const TEMPLATE_OVERRIDES: Record<string, string> =
    VENDOR_TEMPLATE_OVERRIDES[vendorId] ?? VENDOR_TEMPLATE_OVERRIDES["default"] ?? {};

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
    "reminder_ar": (params: any) => {
        return dedent`
        نود تذكيركم بموعد
        ${params.event_name}

        في: ${params.location_name}
        الساعه: ${params.time}

        الرجاء الاحتفاظ بالدعوة الالكترونية و إبرازها عند الدخول

        حضوركم يشرفنا
        `;
    },
    "reminder_en": (params: any) => {
        return dedent`
        A friendly reminder about this upcoming event:

        ${params.event_name}

        Location: ${params.location_name}
        Time: ${params.time}

        Please save your digital invitation and show it at the entrance.

        We look forward to welcoming you.
        `;
    },
};
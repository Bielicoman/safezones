/**
 * Live Version Synchronizer for Safe Zones Website
 * Automatically fetches version.json and updates all DOM badges, buttons, and metadata.
 */
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`version.json?_t=${timestamp}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.version) return;

        const v = data.version;
        const name = data.name || "Safe Zones";

        document.title = `${name} v${v} — Guia de Enquadramento Oficial para Adobe Premiere Pro`;

        document.querySelectorAll(".brand-tag, .tag, [data-version-tag]").forEach(el => {
            el.textContent = `v${v} CEP`;
        });

        document.querySelectorAll(".live-version-tag").forEach(el => {
            el.textContent = `v${v}`;
        });

        console.log(`[VersionSync] Safe Zones Live sync active: v${v}`);
    } catch (e) {
        console.warn("[VersionSync] Failed to fetch live version.json:", e);
    }
});

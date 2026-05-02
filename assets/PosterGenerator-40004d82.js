import{c as t,a as d,j as e,X as l}from"./index-a64e6afd.js";import{B as s}from"./Button-8bf9ccb8.js";import{M as p}from"./map-pin-1a6db207.js";import{H as c}from"./heart-db8435d8.js";const x=t("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]),h=t("Printer",[["polyline",{points:"6 9 6 2 18 2 18 9",key:"1306q4"}],["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["rect",{width:"12",height:"8",x:"6",y:"14",key:"5ipwut"}]]);function b({report:i,onClose:o}){const{t:r}=d(),n=()=>{window.print()},a=`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin+"/map?id="+i.id)}`;return e.jsxs("div",{className:"poster-modal-overlay",children:[e.jsxs("div",{className:"poster-modal",children:[e.jsxs("div",{className:"poster-modal-header",children:[e.jsx("h3",{children:"Generate Missing Pet Poster"}),e.jsx("button",{onClick:o,className:"close-btn",children:e.jsx(l,{size:20})})]}),e.jsx("div",{className:"poster-preview-container",children:e.jsxs("div",{className:"printable-poster",id:"missing-pet-poster",children:[e.jsxs("div",{className:"poster-header",children:[e.jsx("h1",{children:"MISSING PET"}),e.jsx("div",{className:"poster-reward",children:"REWARD OFFERED"})]}),e.jsxs("div",{className:"poster-main",children:[e.jsx("div",{className:"poster-image-wrap",children:e.jsx("img",{src:i.photos[0],alt:"Missing Pet",className:"poster-image"})}),e.jsxs("div",{className:"poster-info",children:[e.jsx("div",{className:"poster-name",children:i.identity.name||"Help us find them!"}),e.jsxs("div",{className:"poster-details-grid",children:[e.jsxs("div",{className:"p-detail",children:[e.jsx("strong",{children:"Type:"})," ",i.identity.type]}),e.jsxs("div",{className:"p-detail",children:[e.jsx("strong",{children:"Breed:"})," ",i.identity.breed||"Unknown"]}),e.jsxs("div",{className:"p-detail",children:[e.jsx("strong",{children:"Color:"})," ",i.identity.primaryColor]}),e.jsxs("div",{className:"p-detail",children:[e.jsx("strong",{children:"Last Seen:"})," ",formatDate(i.lastSeen.date)]})]}),e.jsxs("div",{className:"poster-description",children:[e.jsx("h3",{children:"Distinguishing Features"}),e.jsx("p",{children:i.identity.distinguishingFeatures||"No specific features listed."}),e.jsx("h3",{children:"Last Seen At"}),e.jsxs("p",{children:[e.jsx(p,{size:14,inline:!0})," ",i.lastSeen.location.address]})]})]})]}),e.jsxs("div",{className:"poster-footer",children:[e.jsxs("div",{className:"poster-contact",children:[e.jsxs("h2",{children:["PLEASE CALL: ",i.contact.phone]}),e.jsxs("p",{children:["Contact: ",i.contact.name]})]}),e.jsxs("div",{className:"poster-qr",children:[e.jsx("img",{src:a,alt:"Scan to report sighting"}),e.jsx("span",{children:"Scan to report sighting"})]})]}),e.jsxs("div",{className:"poster-branding",children:[e.jsx(c,{size:16,fill:"currentColor"})," Created with ",e.jsx("strong",{children:r.brand.name})]})]})}),e.jsxs("div",{className:"poster-actions",children:[e.jsx(s,{variant:"secondary",icon:e.jsx(h,{size:18}),onClick:n,children:"Print Poster"}),e.jsx(s,{variant:"primary",icon:e.jsx(x,{size:18}),onClick:()=>alert("Feature coming soon: Direct Image Download"),children:"Download Image"})]})]}),e.jsx("style",{children:`
        .poster-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .poster-modal {
          background: var(--color-bg-primary);
          border-radius: 16px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .poster-modal-header {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
        }
        .poster-preview-container {
          flex: 1;
          overflow-y: auto;
          padding: 40px;
          background: var(--color-bg-secondary);
          display: flex;
          justify-content: center;
        }
        
        /* Printable Poster Styles */
        .printable-poster {
          background: white;
          color: black;
          width: 595px; /* A4 width in pixels at 72dpi roughly */
          min-height: 842px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          border: 1px solid #ddd;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .poster-header { text-align: center; margin-bottom: 30px; }
        .poster-header h1 { font-size: 64px; font-weight: 900; color: #e11d48; margin: 0; line-height: 1; }
        .poster-reward { background: #000; color: #fff; display: inline-block; padding: 4px 20px; font-weight: 700; font-size: 20px; margin-top: 10px; }

        .poster-main { display: flex; gap: 30px; flex: 1; }
        .poster-image-wrap { flex: 1; }
        .poster-image { width: 100%; aspect-ratio: 1; object-fit: cover; border: 4px solid #000; border-radius: 8px; }

        .poster-info { flex: 1; }
        .poster-name { font-size: 36px; font-weight: 800; margin-bottom: 20px; border-bottom: 3px solid #eee; padding-bottom: 10px; }
        .poster-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 16px; }
        .poster-description h3 { font-size: 18px; margin-bottom: 8px; color: #444; }
        .poster-description p { font-size: 15px; line-height: 1.4; margin-bottom: 20px; color: #666; }

        .poster-footer { 
          margin-top: 40px; 
          padding-top: 30px; 
          border-top: 4px dashed #ddd; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }
        .poster-contact h2 { font-size: 28px; font-weight: 800; margin-bottom: 5px; }
        .poster-contact p { font-size: 18px; color: #555; }
        
        .poster-qr { text-align: center; }
        .poster-qr img { width: 100px; height: 100px; margin-bottom: 5px; }
        .poster-qr span { font-size: 10px; display: block; color: #888; }

        .poster-branding { text-align: center; margin-top: 30px; font-size: 12px; color: #aaa; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .poster-actions { padding: 20px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 12px; }

        @media print {
          body * { visibility: hidden; }
          #missing-pet-poster, #missing-pet-poster * { visibility: visible; }
          #missing-pet-poster { position: fixed; left: 0; top: 0; width: 100%; height: 100%; border: none; box-shadow: none; margin: 0; padding: 40px; }
          .poster-modal-overlay, .poster-actions, .poster-modal-header { display: none; }
        }
      `})]})}export{h as P,b as a};

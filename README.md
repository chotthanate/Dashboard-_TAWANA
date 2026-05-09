# แดชบอร์ดรายรับรายจ่ายร้านน้ำ ทาวน่า 2569

เว็บแอพแบบ static สำหรับดูรายรับรายจ่ายจาก Google Sheets:

- โหลดข้อมูลสดจากชีตผ่าน Google Visualization JSONP
- ดูรายรับ รายจ่าย กำไรสุทธิ รายจ่ายผลไม้ และการเปลี่ยนแปลงเทียบเดือนก่อน
- เจาะหมวดหมู่ ประเภทย่อย รายการผลไม้ กราฟ และตารางธุรกรรม
- มี cache ใน browser สำหรับใช้ข้อมูลล่าสุดที่เคยโหลดได้

เปิดใช้งานผ่าน local server:

```powershell
C:\Users\ADMIN\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m http.server 4173
```

จากนั้นเปิด `http://localhost:4173`

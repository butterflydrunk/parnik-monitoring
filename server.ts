import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Nodemailer transporter (Greenhouse alert notifications)
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const alertRecipient = process.env.ALERT_EMAIL_TO || 'admin@example.com';
  const alertSender = process.env.ALERT_EMAIL_FROM || '"Hasabat Belent Agro" <alerts@example.com>';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: smtpUser && smtpPass ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Safe email sender
  const sendAlertEmail = async (subject: string, html: string) => {
    if (!smtpUser || !smtpPass) {
      console.log('SMTP credentials not configured. Skipping email dispatch.');
      return;
    }
    try {
      await transporter.sendMail({
        from: alertSender,
        to: alertRecipient,
        subject,
        html,
      });
      console.log('Duýduryş e-poçtasy üstünlikli ugradyldy.');
    } catch (err: any) {
      console.warn('Poçta ugratmakda duýduryş (SMTP elýeterli däl ýa-da petiklenen):', err.message);
    }
  };

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // 0. Autentifikasiýa & Giriş (Login & Roles)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: 'ERROR', message: 'Ulanyjy ady we parol gerek!' });
    }

    const user = db.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ status: 'ERROR', message: 'Ulanyjy ady ýa-da parol nädogry!' });
    }

    res.json({
      status: 'OK',
      message: 'Ulgama üstünlikli girildi.',
      user,
    });
  });

  app.get('/api/auth/users', (req, res) => {
    res.json(db.getUsers());
  });

  app.post('/api/auth/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ status: 'ERROR', message: 'Köne we täze parol girizilmeli!' });
    }
    const result = db.changePassword(username, oldPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ status: 'ERROR', message: result.message });
    }
    res.json({ status: 'OK', message: result.message });
  });

  // 1. Operator: Daşky gurşaw maglumatlary (Today's Environment)
  app.get('/api/operator/env', (req, res) => {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const env = db.getTodayEnvData(date);
    res.json(env || {});
  });

  // 1.1 Operator: Täze maglumat goşmak (POST)
  const handleOperatorAdd = (req: express.Request, res: express.Response) => {
    const {
      sane,
      wagt,
      parnik,
      sektor,
      barlag_no,
      drip_ml,
      drain_ml,
      sunrise,
      sunset,
      solar_rad,
      avg_temp,
      radiation,
      t24_avg,
    } = req.body;

    const rad_val = solar_rad || radiation || null;
    const temp_val = avg_temp || t24_avg || null;

    const newRecord = db.insertHasabat({
      sane,
      wagt,
      parnik: Number(parnik),
      sektor: Number(sektor),
      barlag_no: barlag_no ? Number(barlag_no) : null,
      drip_ml: drip_ml ? Number(drip_ml) : null,
      drain_ml: drain_ml ? Number(drain_ml) : null,
      sunrise: sunrise || null,
      sunset: sunset || null,
      solar_rad: rad_val ? Number(rad_val) : null,
      avg_temp: temp_val ? Number(temp_val) : null,
    });

    if (req.headers['accept']?.includes('application/json') || req.xhr) {
      return res.status(201).json({ status: 'OK', record: newRecord });
    }
    res.redirect('/?tab=operator');
  };

  app.post('/api/operator/add', handleOperatorAdd);
  app.post('/operator/add', handleOperatorAdd);

  // 2. Ähli maglumatlary süzgüç bilen çekmek (Records List)
  app.get('/api/records', (req, res) => {
    const records = db.getRecords({
      sane: req.query.sane as string,
      parnik: req.query.parnik as string,
      sektor: req.query.sektor as string,
      date: req.query.date as string,
      week: req.query.week as string,
      month: req.query.month as string,
      period: req.query.period as string,
    });
    res.json(records);
  });

  // 3. Laboratoriýa: Drip we Drenaž maglumatlaryny täzelemek (POST)
  const handleLaboratoriyaUpdate = async (req: express.Request, res: express.Response) => {
    let {
      id,
      drip_ec,
      drip_ph,
      drain_ml,
      drain_ec,
      drain_ph,
      night_drop,
      yil,
      hepde,
      parnik,
      sektor,
      wagt,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID tapylmady.' });
    }

    const parseNum = (val: any) => {
      if (val === '' || val === undefined || val === null) return null;
      if (typeof val === 'string') val = val.replace(',', '.').trim();
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    };

    const d_ec = parseNum(drip_ec);
    const d_ph = parseNum(drip_ph);
    const dr_ml = parseNum(drain_ml);
    const dr_ec = parseNum(drain_ec);
    const dr_ph = parseNum(drain_ph);
    const n_drop = parseNum(night_drop);

    const updated = db.updateLaboratoriya(Number(id), {
      drip_ec: d_ec,
      drip_ph: d_ph,
      drain_ml: dr_ml,
      drain_ec: dr_ec,
      drain_ph: dr_ph,
      night_drop: n_drop,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Setir tapylmady.' });
    }

    // Determine year and week if not provided
    const recordDate = new Date(updated.sane);
    const targetYil = Number(yil) || recordDate.getFullYear();
    // Simple week calculation
    const firstDayOfYear = new Date(targetYil, 0, 1);
    const pastDaysOfYear = (recordDate.getTime() - firstDayOfYear.getTime()) / 86400000;
    const targetHepde = Number(hepde) || Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    const kriter = db.getKriteriya(targetYil, targetHepde);
    const errors: string[] = [];

    if (kriter) {
      if (d_ph !== null && (d_ph < kriter.besin_ph_min || d_ph > kriter.besin_ph_max)) {
        errors.push(`Drip pH: ${d_ph} (Kada: ${kriter.besin_ph_min} - ${kriter.besin_ph_max})`);
      }
      if (d_ec !== null && (d_ec < kriter.besin_ec_min || d_ec > kriter.besin_ec_max)) {
        errors.push(`Drip EC: ${d_ec} (Kada: ${kriter.besin_ec_min} - ${kriter.besin_ec_max})`);
      }
      if (dr_ph !== null && (dr_ph < kriter.drenaj_ph_min || dr_ph > kriter.drenaj_ph_max)) {
        errors.push(`Drenaž pH: ${dr_ph} (Kada: ${kriter.drenaj_ph_min} - ${kriter.drenaj_ph_max})`);
      }
      if (dr_ec !== null && (dr_ec < kriter.drenaj_ec_min || dr_ec > kriter.drenaj_ec_max)) {
        errors.push(`Drenaž EC: ${dr_ec} (Kada: ${kriter.drenaj_ec_min} - ${kriter.drenaj_ec_max})`);
      }

      // Gijeki ýeňleme barlaýyş
      if (n_drop !== null && kriter.gijeki_yenleme_min != null && kriter.gijeki_yenleme_max != null) {
        if (n_drop < kriter.gijeki_yenleme_min || n_drop > kriter.gijeki_yenleme_max) {
          errors.push(`Gijeki Ýeňleme: ${n_drop}% (Kada: ${kriter.gijeki_yenleme_min}% - ${kriter.gijeki_yenleme_max}%)`);
        }
      }

      // Parnikler boýunça aýratyn drenaž ml barlaýyş
      const parnikNum = Number(updated.parnik);
      if (dr_ml !== null) {
        if ([1, 2, 4].includes(parnikNum) && kriter.drenaj_ml_hosa_min != null && kriter.drenaj_ml_hosa_max != null) {
          if (dr_ml < kriter.drenaj_ml_hosa_min || dr_ml > kriter.drenaj_ml_hosa_max) {
            errors.push(`Drenaž ml (Hoşa Pomidor P-${parnikNum}): ${dr_ml} ml (Kada: ${kriter.drenaj_ml_hosa_min} - ${kriter.drenaj_ml_hosa_max} ml)`);
          }
        } else if ([3, 5].includes(parnikNum) && kriter.drenaj_ml_gulgune_min != null && kriter.drenaj_ml_gulgune_max != null) {
          if (dr_ml < kriter.drenaj_ml_gulgune_min || dr_ml > kriter.drenaj_ml_gulgune_max) {
            errors.push(`Drenaž ml (Gülgüne Pomidor P-${parnikNum}): ${dr_ml} ml (Kada: ${kriter.drenaj_ml_gulgune_min} - ${kriter.drenaj_ml_gulgune_max} ml)`);
          }
        }
      }
    }

    if (errors.length > 0) {
      const mailHtml = `<h3>⚠️ ${targetHepde}-nji hepdäniň kadasyndan çykma tapyldy!</h3>
                        <p>Parnik: ${parnik || updated.parnik}, Sektor: ${sektor || updated.sektor}, Wagt: ${wagt || updated.wagt}</p>
                        <ul>${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`;

      sendAlertEmail(
        `⚠️ Duýduryş: ${updated.parnik}-nji Parnik, Sektor ${updated.sektor}`,
        mailHtml
      );

      return res.json({
        status: 'WARNING',
        message: 'Maglumatlar ýazyldy, ýöne käbir görkezijiler kadadan çykdy!',
        alerts: errors,
        record: updated,
      });
    }

    return res.json({
      status: 'OK',
      message: 'Ähli görkezijiler kadada.',
      record: updated,
    });
  };

  app.post('/api/laboratoriya/update', handleLaboratoriyaUpdate);
  app.post('/laboratoriya/update', handleLaboratoriyaUpdate);

  app.post('/api/laboratoriya/add', (req, res) => {
    const {
      sane,
      wagt,
      parnik,
      sektor,
      drip_ml,
      drip_ec,
      drip_ph,
      drain_ml,
      drain_ec,
      drain_ph,
      night_drop,
    } = req.body;

    const parseNum = (v: any) => (v !== null && v !== undefined && v !== '' && !isNaN(Number(v)) ? Number(v) : null);

    const newRec = db.insertHasabat({
      sane: sane || new Date().toISOString().split('T')[0],
      wagt: wagt || new Date().toTimeString().slice(0, 5),
      parnik: Number(parnik) || 1,
      sektor: Number(sektor) || 1,
      drip_ml: parseNum(drip_ml),
      drip_ec: parseNum(drip_ec),
      drip_ph: parseNum(drip_ph),
      drain_ml: parseNum(drain_ml),
      drain_ec: parseNum(drain_ec),
      drain_ph: parseNum(drain_ph),
      night_drop: parseNum(night_drop),
    });

    res.status(201).json({ status: 'OK', record: newRec });
  });

  // 4. Agronom Kömekçisi (POST)
  const handleAgronomUpdate = (req: express.Request, res: express.Response) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID tapylmady' });

    const updated = db.updateAgronom(Number(id), req.body);
    if (!updated) return res.status(404).json({ error: 'Setir tapylmady' });

    res.json({ status: 'OK', record: updated });
  };

  app.post('/api/agronom/update', handleAgronomUpdate);
  app.post('/agronom/update', handleAgronomUpdate);

  // 5. Redaktor: Setiri üýtgetmek (POST)
  const handleRedaktorUpdate = (req: express.Request, res: express.Response) => {
    const { id, sane, wagt, parnik, sektor, drip_ml, drip_ec, drip_ph, drain_ml, drain_ec, drain_ph } = req.body;
    if (!id) return res.status(400).json({ error: 'ID tapylmady' });

    const parseNum = (val: any) => {
      if (val === '' || val === undefined || val === null) return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    };

    const updated = db.updateRedaktor(Number(id), {
      sane,
      wagt,
      parnik: Number(parnik) || 1,
      sektor: Number(sektor) || 1,
      drip_ml: parseNum(drip_ml),
      drip_ec: parseNum(drip_ec),
      drip_ph: parseNum(drip_ph),
      drain_ml: parseNum(drain_ml),
      drain_ec: parseNum(drain_ec),
      drain_ph: parseNum(drain_ph),
    });

    if (!updated) return res.status(404).json({ error: 'Setir tapylmady' });
    res.json({ status: 'OK', record: updated });
  };

  app.post('/api/redaktor/update', handleRedaktorUpdate);
  app.post('/redaktor/update', handleRedaktorUpdate);

  // 5.1 Redaktor: Setiri pozmak (Delete)
  const handleRedaktorDelete = (req: express.Request, res: express.Response) => {
    const id = Number(req.params.id);
    const success = db.deleteRecord(id);
    if (!success) return res.status(404).json({ error: 'Setir tapylmady' });
    res.sendStatus(200);
  };

  app.delete('/api/redaktor/delete/:id', handleRedaktorDelete);
  app.get('/redaktor/delete/:id', handleRedaktorDelete);

  // 6. Hepdelik Kriteriýalar
  const handleKriteriyalarSave = (req: express.Request, res: express.Response) => {
    const {
      yil,
      hepde,
      besin_ph_min,
      besin_ph_max,
      besin_ec_min,
      besin_ec_max,
      drenaj_ph_min,
      drenaj_ph_max,
      drenaj_ec_min,
      drenaj_ec_max,
      gijeki_yenleme_min,
      gijeki_yenleme_max,
      radiasiya_min,
      radiasiya_max,
      drenaj_ml_hosa_min,
      drenaj_ml_hosa_max,
      drenaj_ml_gulgune_min,
      drenaj_ml_gulgune_max,
    } = req.body;

    if (!yil || !hepde) {
      return res.status(400).json({ error: 'Ýyl we hepde görkezilmelidir.' });
    }

    const parseNum = (v: any) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const saved = db.setKriteriya({
      yil: Number(yil),
      hepde: Number(hepde),
      besin_ph_min: Number(besin_ph_min),
      besin_ph_max: Number(besin_ph_max),
      besin_ec_min: Number(besin_ec_min),
      besin_ec_max: Number(besin_ec_max),
      drenaj_ph_min: Number(drenaj_ph_min),
      drenaj_ph_max: Number(drenaj_ph_max),
      drenaj_ec_min: Number(drenaj_ec_min),
      drenaj_ec_max: Number(drenaj_ec_max),
      gijeki_yenleme_min: parseNum(gijeki_yenleme_min),
      gijeki_yenleme_max: parseNum(gijeki_yenleme_max),
      radiasiya_min: parseNum(radiasiya_min),
      radiasiya_max: parseNum(radiasiya_max),
      drenaj_ml_hosa_min: parseNum(drenaj_ml_hosa_min),
      drenaj_ml_hosa_max: parseNum(drenaj_ml_hosa_max),
      drenaj_ml_gulgune_min: parseNum(drenaj_ml_gulgune_min),
      drenaj_ml_gulgune_max: parseNum(drenaj_ml_gulgune_max),
    });

    res.json({
      status: 'OK',
      message: `${hepde}-nji hepdäniň kriteriýalary üstünlikli ýazyldy.`,
      kriteriya: saved,
    });
  };

  app.post('/api/kriteriyalar/yaz', handleKriteriyalarSave);
  app.post('/kriteriyalar/yaz', handleKriteriyalarSave);

  app.get('/api/kriteriyalar', (req, res) => {
    res.json(db.getAllKriteriyalar());
  });

  // 7. Monitoring & Dashboard Awtomatiki Statistika
  app.get('/api/stats', (req, res) => {
    const records = db.getRecords({});
    const totalDrip = records.reduce((acc, r) => acc + (r.drip_ml || 0), 0);
    const totalDrain = records.reduce((acc, r) => acc + (r.drain_ml || 0), 0);
    const avgDrainPercent =
      totalDrip > 0 ? Number(((totalDrain / totalDrip) * 100).toFixed(1)) : 0;

    const ecRecords = records.filter((r) => r.drip_ec !== null);
    const avgDripEc =
      ecRecords.length > 0
        ? Number(
            (ecRecords.reduce((acc, r) => acc + (r.drip_ec || 0), 0) / ecRecords.length).toFixed(2)
          )
        : 0;

    const phRecords = records.filter((r) => r.drip_ph !== null);
    const avgDripPh =
      phRecords.length > 0
        ? Number(
            (phRecords.reduce((acc, r) => acc + (r.drip_ph || 0), 0) / phRecords.length).toFixed(2)
          )
        : 0;

    res.json({
      recordCount: records.length,
      totalDrip,
      totalDrain,
      avgDrainPercent,
      avgDripEc,
      avgDripPh,
    });
  });

  // ----------------------------------------------------
  // Vite Middleware & SPA Serving
  // ----------------------------------------------------
  const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
  const hasBuiltDist = fs.existsSync(distIndexPath);
  const isProduction = process.env.NODE_ENV === 'production' || hasBuiltDist;

  if (isProduction && hasBuiltDist) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(distIndexPath);
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Parnik serweri işleýär: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Serweri işletmekde ýalňyşlyk:', err);
});

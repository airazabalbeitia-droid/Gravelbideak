const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Configuración de credenciales (puedes usar variables de entorno .env)
const CLIENT_ID = '295113';
const CLIENT_SECRET = 'TU_CLIENT_SECRET_AQUI'; // Tu clave secreta
const REDIRECT_URI = 'http://localhost:3000/auth/strava/callback';

// Cliente de Supabase
const supabase = createClient('TU_SUPABASE_URL', 'TU_SUPABASE_ANON_KEY');

// 1. Ruta para iniciar sesión (Redirige a Strava)
app.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=activity:read_all`;
  res.redirect(stravaAuthUrl);
});

// 2. Callback donde Strava devuelve al usuario con el código temporal
app.get('/auth/strava/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Intercambiar el código por los tokens de acceso
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    // Guardar o actualizar el usuario en la tabla 'users' de Supabase
    const { error } = await supabase
      .from('users')
      .upsert({
        strava_id: athlete.id,
        username: `${athlete.firstname} ${athlete.lastname}`,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expires_at
      }, { onConflict: 'strava_id' });

    if (error) throw error;

    res.send(`¡Autenticación con Strava exitosa, ${athlete.firstname}! Ya estás registrado en Gravelbideak.`);
  } catch (err) {
    console.error('Error en la autenticación:', err.response?.data || err.message);
    res.status(500).send('Fallo al autenticar con Strava.');
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
import React from 'react';
import { Text, Linking, Alert, StyleSheet, type TextStyle } from 'react-native';
import { crearTema } from '../theme';

const t = crearTema();

/**
 * Encuentra links, mails y teléfonos dentro de un texto.
 *
 * Los avisos se escriben a mano desde el panel, así que un link
 * llega como texto suelto en el medio de una frase. Sin esto, el
 * socio ve la dirección pero no puede tocarla y tiene que copiarla
 * a mano, que es como no tenerla.
 */
const PATRON = /((?:https?:\/\/|www\.)[^\s<>"')\]]+)|([\w.+-]+@[\w-]+\.[\w.-]+)|(?:\+?\d[\d\s-]{7,}\d)/gi;

function abrir(texto: string) {
  let url = texto.trim().replace(/[.,;:]+$/, ''); // sin la puntuación final

  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(url)) {
    url = 'mailto:' + url;
  } else if (/^\+?[\d\s-]+$/.test(url)) {
    url = 'tel:' + url.replace(/[\s-]/g, '');
  } else if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  Linking.openURL(url).catch(() =>
    Alert.alert('No pudimos abrirlo', texto),
  );
}

export default function TextoConLinks({
  children,
  style,
  linkStyle,
  numberOfLines,
}: {
  children?: string | null;
  style?: TextStyle | TextStyle[];
  linkStyle?: TextStyle;
  numberOfLines?: number;
}) {
  const texto = String(children ?? '');
  if (!texto) return null;

  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;

  // El regex es global: se reinicia por si el componente se
  // vuelve a dibujar con el mismo patrón.
  PATRON.lastIndex = 0;

  while ((m = PATRON.exec(texto)) !== null) {
    if (m.index > ultimo) {
      partes.push(texto.slice(ultimo, m.index));
    }

    const encontrado = m[0];
    // La puntuación final es de la oración, no del link.
    const limpio = encontrado.replace(/[.,;:]+$/, '');
    const sobra = encontrado.slice(limpio.length);

    partes.push(
      <Text
        key={m.index}
        style={[s.link, linkStyle]}
        onPress={() => abrir(limpio)}
        suppressHighlighting={false}
      >
        {limpio}
      </Text>,
    );
    if (sobra) partes.push(sobra);

    ultimo = m.index + encontrado.length;
  }

  if (ultimo < texto.length) partes.push(texto.slice(ultimo));

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {partes}
    </Text>
  );
}

const s = StyleSheet.create({
  link: {
    color: t.color.teal,
    textDecorationLine: 'underline',
  },
});

import React from 'react';
import StatusLayout from 'layouts/StatusLayout';
import { color } from 'lib/variables';
import withAnonymousUser from 'storybook/decorators/AnonymousUser';

export default {
  title: 'Home/Welcome',
};

export const toLagoobernetes = () => (
  <StatusLayout>
    <h1>Lagoobernetes UI</h1>
    <p>This is the style guide for Lagoobernetes.</p>
    <h4>Keyboard shortcuts</h4>
    <p>
      To toggle the display of the “add-ons” panel, press the <kbd>A</kbd> key.
    </p>
    <p>
      More keyboard shortcuts are available.
      {' '}
      <a href="/?path=/settings/shortcuts" style={{color: color.blue}} className="hover-state">
        See the keyboard shortcuts page
      </a>
      {' '}
      or use the <b>circled … button</b> near the top left of this website.
    </p>
  </StatusLayout>
);
toLagoobernetes.story = {
  name: 'to Lagoobernetes',
  decorators: [ withAnonymousUser ],
};

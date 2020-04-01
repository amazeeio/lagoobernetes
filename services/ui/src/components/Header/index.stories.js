import React from 'react';
import withAnonymousUser from 'storybook/decorators/AnonymousUser';
import Header from './index';
import newLogo from './amazeeio.svg';

export default {
  component: Header,
  title: 'Components/Header',
}

export const Default = () => <Header />;

export const OverriddenLogo = () => (
  <Header logo={newLogo} />
);
OverriddenLogo.story = {
  parameters: {
    docs: {
      storyDescription: `If the <code>LAGOOBERNETES\\_UI\\_ICON</code> environment variable
        is set to a URL-encoded SVG, it will be used instead of the default
        Lagoobernetes logo.`,
    },
  },
};

export const AnonymousUser = () => <Header />;
AnonymousUser.story = {
  decorators: [ withAnonymousUser ],
  parameters: {
    docs: {
      storyDescription: 'When no user is logged in.',
    },
  },
};

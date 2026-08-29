import { render } from 'preact';
import { App } from './components/App';
import './style.scss';

const root = document.createElement('div');
root.id = 'flow-tools-root';
document.body.appendChild(root);
render(<App />, root);

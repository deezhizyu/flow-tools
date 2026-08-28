import { render } from 'preact';
import { App } from './App';
import './style.css';

const root = document.createElement('div');
root.id = 'flow-tools-root';
document.body.appendChild(root);
render(<App />, root);

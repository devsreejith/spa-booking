import React from 'react';
import { logError } from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }
  componentDidCatch(error, info) {
    logError('UI.Exception', { error: error?.message, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: '#ef4444' }}>
          Something went wrong: {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

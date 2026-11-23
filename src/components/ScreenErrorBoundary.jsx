import React from 'react';

/**
 * Keeps the last successfully rendered screen visible if the next screen
 * throws while rendering.
 */
export default class ScreenErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this.props.onScreenLoaded?.(this.props.screen);
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(this.props.previousScreen, error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (!this.state.error && previousProps.screen !== this.props.screen) {
      this.props.onScreenLoaded?.(this.props.screen);
    }
  }

  render() {
    const screenToRender = this.state.error
      ? this.props.previousScreen
      : this.props.screen;

    return (
      <>
        {this.props.renderScreen(screenToRender)}
        {this.state.error && (
          <p role="alert">This screen could not be loaded</p>
        )}
      </>
    );
  }
}

// @ts-nocheck
import React from 'react'
import reactCSS from 'reactcss'
import { SketchPicker } from 'react-color'
import { getThemeColor } from '@/utils/dom'

class ThemePicker extends React.Component {
    state = {
        displayColorPicker: false,
        color: getThemeColor(),
        colorChanged: false
    }

    handleClick = () => {
        this.setState({ displayColorPicker: !this.state.displayColorPicker })
    }

    handleClose = () => {
        this.setState({ displayColorPicker: false })

        if (this.state.colorChanged) {
            window.location.reload()
        }
    }

    handleChange = (color: { hex: string; rgb: any }) => {
        localStorage.setItem('USER_COLOR', color.hex)
        this.setState({ color: color.rgb, colorChanged: true })
    }

    render() {
        const styles = reactCSS({
            default: {
                color: {
                    width: '36px',
                    height: '14px',
                    borderRadius: '2px',
                    background: `${this.state.color}`
                },
                swatch: {
                    padding: '5px',
                    background: '#fff',
                    borderRadius: '1px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
                    display: 'inline-block',
                    cursor: 'pointer'
                },
                popover: {
                    position: 'absolute',
                    zIndex: 2,
                    top: '-320px',
                    left: '15px'
                },
                cover: {
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                }
            }
        })

        return (
            <div style={{ position: 'relative', marginTop: '5px' }}>
                <div style={styles.swatch} onClick={this.handleClick}>
                    <div style={styles.color} />
                </div>
                {this.state.displayColorPicker ? (
                    <div style={styles.popover}>
                        <div style={styles.cover} onClick={this.handleClose} />
                        <SketchPicker
                            color={this.state.color}
                            onChange={this.handleChange}
                        />
                    </div>
                ) : null}
            </div>
        )
    }
}

export default ThemePicker

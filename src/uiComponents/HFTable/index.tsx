import { BaseTable } from 'ali-react-table'
import styled from 'styled-components'

export const HFTable = styled(BaseTable)`
     {
        --color: var(--hf-ui-font-color1);
        --bgcolor: (--hf-layout-light);
        --row-height: 34px;
        --hover-bgcolor: var(--hf-ui-highlight-bg, #f5f5f5);
        --highlight-bgcolor: var(--jp-layout-color1);
        --header-row-height: 30px;
        --header-color: var(--hf-ui-font-color0);
        --header-bgcolor: var(--jp-layout-color2);
        --header-hover-bgcolor: #ddd;
        --header-highlight-bgcolor: #e4e8ed;
        --cell-padding: 4px 12px;
        --font-size: 12px;
        --line-height: 1.28571;
        --lock-shadow: rgba(152, 152, 152, 0.5) 0 0 6px 2px;
        --border-color: var(--hf-table-border-color);
        --header-cell-border-horizontal: none;
        --header-cell-border: none;
    }
`

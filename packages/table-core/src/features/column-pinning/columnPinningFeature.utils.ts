import {
  column_getIsVisible,
  row_getAllVisibleCells,
  table_getVisibleLeafColumns,
} from '../column-visibility/columnVisibilityFeature.utils'
import { buildHeaderGroups } from '../../core/headers/buildHeaderGroups'
import { callMemoOrStaticFn } from '../../utils'
import type { HeaderGroup } from '../../types/HeaderGroup'
import type { Cell } from '../../types/Cell'
import type { Row } from '../../types/Row'
import type { CellData, RowData, Updater } from '../../types/type-utils'
import type { TableFeatures } from '../../types/TableFeatures'
import type { Table_Internal } from '../../types/Table'
import type { Column_Internal } from '../../types/Column'
import type {
  ColumnPinningPosition,
  ColumnPinningState,
} from './columnPinningFeature.types'

// State

export function getDefaultColumnPinningState(): ColumnPinningState {
  return structuredClone({
    start: [],
    end: [],
  })
}

// Column APIs

export function column_pin<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(
  column: Column_Internal<TFeatures, TData, TValue>,
  position: ColumnPinningPosition,
) {
  const columnIds = column
    .getLeafColumns()
    .map((d) => d.id)
    .filter(Boolean)

  table_setColumnPinning(column._table, (old) => {
    if (position === 'end') {
      return {
        end: [
          ...old.end.filter((d) => !columnIds.includes(d)),
          ...columnIds,
        ],
        start: old.start.filter((d) => !columnIds.includes(d)),
      }
    }

    if (position === 'start') {
      return {
        start: [...old.start.filter((d) => !columnIds.includes(d)), ...columnIds],
        end: old.end.filter((d) => !columnIds.includes(d)),
      }
    }

    return {
      start: old.start.filter((d) => !columnIds.includes(d)),
      end: old.end.filter((d) => !columnIds.includes(d)),
    }
  })
}

export function column_getCanPin<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>) {
  const leafColumns = column.getLeafColumns() as Array<
    Column_Internal<TFeatures, TData, TValue>
  >

  return leafColumns.some(
    (leafColumn) =>
      (leafColumn.columnDef.enablePinning ?? true) &&
      (column._table.options.enableColumnPinning ?? true),
  )
}

export function column_getIsPinned<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(
  column: Column_Internal<TFeatures, TData, TValue>,
): ColumnPinningPosition | false {
  const leafColumnIds = column.getLeafColumns().map((d) => d.id)

  const { start, end } =
    column._table.options.state?.columnPinning ?? getDefaultColumnPinningState()

  const isStart = leafColumnIds.some((d) => start.includes(d))
  const isEnd = leafColumnIds.some((d) => end.includes(d))

  return isStart ? 'start' : isEnd ? 'end' : false
}

export function column_getPinnedIndex<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData = CellData,
>(column: Column_Internal<TFeatures, TData, TValue>) {
  const position = column_getIsPinned(column)

  return position
    ? (column._table.options.state?.columnPinning?.[position].indexOf(
        column.id,
      ) ?? -1)
    : 0
}

// Row APIs

export function row_getCenterVisibleCells<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>) {
  const allCells = callMemoOrStaticFn(
    row,
    'getAllVisibleCells',
    row_getAllVisibleCells,
  )
  const { start, end } =
    row._table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  const startAndEnd: Array<string> = [...start, ...end]
  return allCells.filter((d) => !startAndEnd.includes(d.column.id))
}

export function row_getLeftVisibleCells<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>): Array<Cell<TFeatures, TData, unknown>> {
  const allCells = callMemoOrStaticFn(
    row,
    'getAllVisibleCells',
    row_getAllVisibleCells,
  )
  const { start } =
    row._table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  const cells = start
    .map((columnId) => allCells.find((cell) => cell.column.id === columnId)!)
    .filter(Boolean)
    .map((d) => ({ ...d, position: 'start' }))
  return cells as any
}

export function row_getRightVisibleCells<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>) {
  const allCells = callMemoOrStaticFn(
    row,
    'getAllVisibleCells',
    row_getAllVisibleCells,
  )
  const { end } =
    row._table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  const cells = end
    .map((columnId) => allCells.find((cell) => cell.column.id === columnId)!)
    .filter(Boolean)
    .map((d) => ({ ...d, position: 'end' }))
  return cells as any
}

// Table APIs

export function table_setColumnPinning<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
  updater: Updater<ColumnPinningState>,
) {
  table.options.onColumnPinningChange?.(updater)
}

export function table_resetColumnPinning<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>, defaultState?: boolean) {
  table_setColumnPinning(
    table,
    defaultState
      ? getDefaultColumnPinningState()
      : (table.initialState.columnPinning ?? getDefaultColumnPinningState()),
  )
}

export function table_getIsSomeColumnsPinned<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>, position?: ColumnPinningPosition) {
  const pinningState = table.options.state?.columnPinning

  if (!position) {
    return Boolean(pinningState?.start.length || pinningState?.end.length)
  }
  return Boolean(pinningState?.[position].length)
}

// header groups

export function table_getLeftHeaderGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const allColumns = table.getAllColumns()
  const leafColumns = callMemoOrStaticFn(
    table,
    'getVisibleLeafColumns',
    table_getVisibleLeafColumns,
  ) as unknown as Array<Column_Internal<TFeatures, TData, unknown>>
  const { start } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()

  const orderedLeafColumns = start
    .map((columnId) => leafColumns.find((d) => d.id === columnId)!)
    .filter(Boolean)

  return buildHeaderGroups(allColumns, orderedLeafColumns, table, 'left')
}

export function table_getRightHeaderGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const allColumns = table.getAllColumns()
  const leafColumns = callMemoOrStaticFn(
    table,
    'getVisibleLeafColumns',
    table_getVisibleLeafColumns,
  ) as unknown as Array<Column_Internal<TFeatures, TData, unknown>>
  const { end } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()

  const orderedLeafColumns = end
    .map((columnId) => leafColumns.find((d) => d.id === columnId)!)
    .filter(Boolean)

  return buildHeaderGroups(allColumns, orderedLeafColumns, table, 'right')
}

export function table_getCenterHeaderGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
): Array<HeaderGroup<TFeatures, TData>> {
  const allColumns = table.getAllColumns()
  let leafColumns = callMemoOrStaticFn(
    table,
    'getVisibleLeafColumns',
    table_getVisibleLeafColumns,
  ) as unknown as Array<Column_Internal<TFeatures, TData, unknown>>
  const { start, end } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  const startAndEnd: Array<string> = [...start, ...end]

  leafColumns = leafColumns.filter(
    (column) => !startAndEnd.includes(column.id),
  )
  return buildHeaderGroups(allColumns, leafColumns, table, 'center')
}

// footer groups

export function table_getLeftFooterGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const headerGroups = callMemoOrStaticFn(
    table,
    'getLeftHeaderGroups',
    table_getLeftHeaderGroups,
  )
  return [...headerGroups].reverse()
}

export function table_getRightFooterGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const headerGroups = callMemoOrStaticFn(
    table,
    'getRightHeaderGroups',
    table_getRightHeaderGroups,
  )
  return [...headerGroups].reverse()
}

export function table_getCenterFooterGroups<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const headerGroups = callMemoOrStaticFn(
    table,
    'getCenterHeaderGroups',
    table_getCenterHeaderGroups,
  )
  return [...headerGroups].reverse()
}

// flat headers

export function table_getLeftFlatHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const leftHeaderGroups = callMemoOrStaticFn(
    table,
    'getLeftHeaderGroups',
    table_getLeftHeaderGroups,
  )
  return leftHeaderGroups
    .map((headerGroup) => {
      return headerGroup.headers
    })
    .flat()
}

export function table_getRightFlatHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const rightHeaderGroups = callMemoOrStaticFn(
    table,
    'getRightHeaderGroups',
    table_getRightHeaderGroups,
  )
  return rightHeaderGroups
    .map((headerGroup) => {
      return headerGroup.headers
    })
    .flat()
}

export function table_getCenterFlatHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const centerHeaderGroups = callMemoOrStaticFn(
    table,
    'getCenterHeaderGroups',
    table_getCenterHeaderGroups,
  )
  return centerHeaderGroups
    .map((headerGroup) => {
      return headerGroup.headers
    })
    .flat()
}

// leaf headers

export function table_getLeftLeafHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getLeftFlatHeaders',
    table_getLeftFlatHeaders,
  ).filter((header) => !header.subHeaders.length)
}

export function table_getRightLeafHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getRightFlatHeaders',
    table_getRightFlatHeaders,
  ).filter((header) => !header.subHeaders.length)
}

export function table_getCenterLeafHeaders<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getCenterFlatHeaders',
    table_getCenterFlatHeaders,
  ).filter((header) => !header.subHeaders.length)
}

// leaf columns

export function table_getLeftLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const { start } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  return start
    .map(
      (columnId) =>
        table.getAllLeafColumns().find((column) => column.id === columnId)!,
    )
    .filter(Boolean)
}

export function table_getRightLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const { end } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  return end
    .map(
      (columnId) =>
        table.getAllLeafColumns().find((column) => column.id === columnId)!,
    )
    .filter(Boolean)
}

export function table_getCenterLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  const { start, end } =
    table.options.state?.columnPinning ?? getDefaultColumnPinningState()
  const startAndEnd: Array<string> = [...start, ...end]
  return table.getAllLeafColumns().filter((d) => !startAndEnd.includes(d.id))
}

export function table_getPinnedLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
  position: ColumnPinningPosition | 'center',
) {
  return !position
    ? table.getAllLeafColumns()
    : position === 'start'
      ? callMemoOrStaticFn(
          table,
          'getLeftLeafColumns',
          table_getLeftLeafColumns,
        )
      : position === 'end'
        ? callMemoOrStaticFn(
            table,
            'getRightLeafColumns',
            table_getRightLeafColumns,
          )
        : callMemoOrStaticFn(
            table,
            'getCenterLeafColumns',
            table_getCenterLeafColumns,
          )
}

// visible leaf columns

export function table_getLeftVisibleLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getLeftLeafColumns',
    table_getLeftLeafColumns,
  ).filter((column) =>
    callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
  )
}

export function table_getRightVisibleLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getRightLeafColumns',
    table_getRightLeafColumns,
  ).filter((column) =>
    callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
  )
}

export function table_getCenterVisibleLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(table: Table_Internal<TFeatures, TData>) {
  return callMemoOrStaticFn(
    table,
    'getCenterLeafColumns',
    table_getCenterLeafColumns,
  ).filter((column) =>
    callMemoOrStaticFn(column, 'getIsVisible', column_getIsVisible),
  )
}

export function table_getPinnedVisibleLeafColumns<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(
  table: Table_Internal<TFeatures, TData>,
  position?: ColumnPinningPosition | 'center',
) {
  return !position
    ? callMemoOrStaticFn(
        table,
        'getVisibleLeafColumns',
        table_getVisibleLeafColumns,
      )
    : position === 'start'
      ? callMemoOrStaticFn(
          table,
          'getLeftVisibleLeafColumns',
          table_getLeftVisibleLeafColumns,
        )
      : position === 'end'
        ? callMemoOrStaticFn(
            table,
            'getRightVisibleLeafColumns',
            table_getRightVisibleLeafColumns,
          )
        : callMemoOrStaticFn(
            table,
            'getCenterVisibleLeafColumns',
            table_getCenterVisibleLeafColumns,
          )
}

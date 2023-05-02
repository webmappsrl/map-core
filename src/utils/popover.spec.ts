import {getFlowPopoverText} from './popover';

describe('popover', () => {
  it('getFlowPopoverText: should return a green message for low altitude', () => {
    const result = getFlowPopoverText(500);
    expect(result).toContain('<span class="green">');
  });

  it('getFlowPopoverText: should return an orange message for partially high altitude', () => {
    const result = getFlowPopoverText(1000);
    expect(result).toContain('<span class="orange">');
  });

  it('getFlowPopoverText: should return a red message for high altitude', () => {
    const result = getFlowPopoverText(2000);
    expect(result).toContain('<span class="red">');
  });

  it('getFlowPopoverText: should use custom thresholds if provided', () => {
    const result = getFlowPopoverText(1500, 1000, 2000);
    expect(result).toContain('<span class="orange">');
  });
});

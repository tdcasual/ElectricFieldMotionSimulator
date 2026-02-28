import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PhoneAddSheet from '../src/components/PhoneAddSheet.vue';
import PhoneAuthoringSheets from '../src/components/PhoneAuthoringSheets.vue';
import PhoneMoreSheet from '../src/components/PhoneMoreSheet.vue';
import PhoneSceneSheet from '../src/components/PhoneSceneSheet.vue';
import PhoneSelectedSheet from '../src/components/PhoneSelectedSheet.vue';

function mountSheets(overrides: Record<string, unknown> = {}) {
  return mount(PhoneAuthoringSheets, {
    props: {
      showAuthoringControls: true,
      isPhoneLayout: true,
      phoneAddSheetOpen: false,
      phoneSelectedSheetOpen: false,
      phoneSceneSheetOpen: false,
      phoneMoreSheetOpen: false,
      phoneAnySheetOpen: false,
      toolbarGroups: [
        {
          key: 'particle',
          label: '粒子',
          entries: [{ type: 'particle', label: '粒子' }]
        }
      ],
      selectedObjectId: 'obj-1',
      propertyTitle: '选中对象',
      phoneSelectedScale: 1,
      phoneSelectedGeometryRows: [],
      showEnergyOverlay: true,
      pixelsPerMeter: 100,
      gravity: 9.8,
      boundaryMode: 'margin',
      showBoundaryMarginControl: true,
      boundaryMargin: 200,
      timeStep: 0.016,
      timeStepLabel: '16ms',
      demoMode: false,
      ...overrides
    }
  });
}

describe('PhoneAuthoringSheets', () => {
  it('forwards add and preset events', async () => {
    const wrapper = mountSheets({ phoneAddSheetOpen: true, phoneAnySheetOpen: true });

    wrapper.findComponent(PhoneAddSheet).vm.$emit('create', 'particle');
    wrapper.findComponent(PhoneAddSheet).vm.$emit('load-preset', 'cyclotron');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('create-object')).toEqual([['particle']]);
    expect(wrapper.emitted('load-preset')).toEqual([['cyclotron']]);

    await wrapper.get('.phone-sheet-backdrop').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('forwards selected, scene and more sheet events', async () => {
    const wrapper = mountSheets({
      phoneSelectedSheetOpen: true,
      phoneSceneSheetOpen: true,
      phoneMoreSheetOpen: true
    });

    wrapper.findComponent(PhoneSelectedSheet).vm.$emit('open-properties');
    wrapper.findComponent(PhoneSelectedSheet).vm.$emit('duplicate');
    wrapper.findComponent(PhoneSelectedSheet).vm.$emit('delete');
    wrapper.findComponent(PhoneSelectedSheet).vm.$emit('update-value', { key: 'radius', value: '3' });

    wrapper.findComponent(PhoneSceneSheet).vm.$emit('set-show-energy', new Event('change'));
    wrapper.findComponent(PhoneSceneSheet).vm.$emit('set-time-step', new Event('input'));

    wrapper.findComponent(PhoneMoreSheet).vm.$emit('export-scene');
    wrapper.findComponent(PhoneMoreSheet).vm.$emit('open-import');
    wrapper.findComponent(PhoneMoreSheet).vm.$emit('toggle-markdown');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('open-selected-properties')).toHaveLength(1);
    expect(wrapper.emitted('duplicate-selected')).toHaveLength(1);
    expect(wrapper.emitted('delete-selected')).toHaveLength(1);
    expect(wrapper.emitted('update-phone-selected-value')).toEqual([[{ key: 'radius', value: '3' }]]);
    expect(wrapper.emitted('set-show-energy')).toHaveLength(1);
    expect(wrapper.emitted('set-time-step')).toHaveLength(1);
    expect(wrapper.emitted('export-scene')).toHaveLength(1);
    expect(wrapper.emitted('open-import')).toHaveLength(1);
    expect(wrapper.emitted('toggle-markdown')).toHaveLength(1);
  });
});
